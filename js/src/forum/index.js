// Flarum 2.0 forum entry for the chat extension.
//
// Note on the deep-link 400: the historical "store.find interceptor"
// workaround is intentionally removed. The 400
//   "You can only use page[near] with filter[discussion]..."
// was caused by nginx passing a malformed QUERY_STRING
// (try_files /index.php?$is_args$query_string produced a doubled '?',
// so PHP parsed the first key as "?filter" and Flarum saw no filter).
// That is now fixed server-side in the 1panel openresty rewrite file,
// so Flarum can handle store.find('posts', {filter:{discussion}, page:{near}})
// natively. The interceptor's empty-result fallback also starved the
// post stream on first load, so removing it restores correct behavior.
//
// Priority order:
//   1) Chat UI wiring — wrapped in try/catch so it cannot break boot.
//   2) Valid { extend: [] } export — prevents "r is undefined" in bootExtensions.
//
// Import strategy:
//   - Extension-internal modules (./components/*, ./models/*, ./states/*, ./addChatPage)
//     are bundled by webpack via relative ES imports — NOT from flarum.reg.
//   - Flarum core modules use standard `import X from 'flarum/...'` — the
//     custom Babel plugin compiles them to EAGER flarum.reg.get() calls with
//     __esModule unwrapping (same pattern as official fof/* extensions).
//     Do NOT hand-roll flarum.reg.get() here: it returns the module NAMESPACE
//     object, not the default export — calling/extending it fails silently.

import { extend as flarumExtend } from 'flarum/common/extend';
import Application from 'flarum/common/Application';
import User from 'flarum/common/models/User';
import Model from 'flarum/common/Model';

import ChatFrame from './components/ChatFrame';
import Chat from './models/Chat';
import Message from './models/Message';
import ChatState from './states/ChatState';
import addChatPage from './addChatPage';

app.initializers.add('acolasialiuliu-chat', (app) => {
  // ═══════════════════════════════════════════════════════════════
  // Chat UI wiring (isolated — must not break forum boot)
  // ═══════════════════════════════════════════════════════════════
  try {
    if (!extend || !User || !Model) {
      console.warn('[chat] Required core modules not available, skipping UI init');
      return;
    }

    // Register chat models on the store
    app.store.models.chats = Chat;
    app.store.models.chatmessages = Message;

    // Per-user chat membership pivot helpers
    function makePivot(name, chatId, attr, transform) {
      return function () {
        var val =
          this.data.attributes[name] &&
          this.data.attributes[name][chatId] &&
          this.data.attributes[name][chatId][attr];
        return transform ? transform(val) : val;
      };
    }

    function makePivotHasOne(name, chatId, attr) {
      return function () {
        var rel =
          this.data.attributes[name] &&
          this.data.attributes[name][chatId] &&
          this.data.attributes[name][chatId][attr];
        if (rel) return app.store.getById(rel.data.type, rel.data.id);
      };
    }

    Object.assign(User.prototype, {
      chat_pivot: function (chat_id) {
        return {
          role: makePivot('chat_pivot', chat_id, 'role').bind(this),
          removed_by: makePivotHasOne('chat_pivot', chat_id, 'removed_by').bind(this),
          readed_at: makePivot('chat_pivot', chat_id, 'readed_at', Model.transformDate).bind(this),
          removed_at: makePivot('chat_pivot', chat_id, 'removed_at', Model.transformDate).bind(this),
          joined_at: makePivot('chat_pivot', chat_id, 'joined_at', Model.transformDate).bind(this),
        };
      },
    });

    // Mount chat frame into the #chat div. The container is created here if
    // it does not already exist (the floating frame is appended to <body>,
    // matching the upstream xelson-chat behavior). Without this, the panel
    // silently never mounts and the chat entry is invisible.
    if (Application && Application.prototype) {
      flarumExtend(Application.prototype, 'mount', function () {
        if (!app.forum.attribute('xelson-chat.permissions.enabled')) return;

        // Block guests from using chat when setting is enabled.
        // Flarum 2.0: Guest extends User but isGuest() ONLY exists on the
        // Guest class — a logged-in User has no isGuest() method, so calling
        // it crashes mount. Use id() === null to detect guests instead.
        var blockGuests = app.forum.attribute('xelson-chat.settings.block_guests');
        var isGuest = !app.session.user || app.session.user.id() === null;
        if (blockGuests && blockGuests !== '0' && isGuest) {
          console.log('[chat] Chat is disabled for guests');
          return;
        }

        app.chat = new ChatState();

        var chatEl = document.getElementById('chat');
        if (!chatEl) {
          chatEl = document.createElement('div');
          chatEl.setAttribute('id', 'chat');
          document.body.appendChild(chatEl);
        }
        m.mount(chatEl, ChatFrame);

        if ('Notification' in window && app.chat && app.chat.getFrameState && app.chat.getFrameState('notify')) {
          Notification.requestPermission();
        }

        if (!app.pusher) {
          console.warn('[chat] Pusher is not configured — realtime updates disabled, chat still works.');
        }

        if (app.chat && app.chat.apiFetchChats) {
          app.chat.apiFetchChats();
        }
      });
    }

    // Register /chat route + mobile nav entry
    if (typeof addChatPage === 'function') addChatPage();

  } catch (e) {
    console.warn('[chat] UI initialization failed (non-critical):', e.message || e);
  }
});

// Flarum 2.0 loads extension entries as ESM (harmony) modules and wraps each
// module's `exports` with an ESM guard (webpack `t.hmd`) that THROWS on any
// `module.exports =` assignment. So we must use an ESM named export here.
// `bootExtensions` reads `r.extend` off the module's exports, so exporting an
// (empty) `extend` array keeps the 1.x-compatible contract without crashing.
export const extend = [];
