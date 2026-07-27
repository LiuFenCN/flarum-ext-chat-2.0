import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import classList from 'flarum/common/utils/classList';
import { avatar } from '../utils/compat';
import username from 'flarum/common/helpers/username';
import highlight from 'flarum/common/helpers/highlight';

/**
 * User picker for private chat creation.
 *
 * Architecture notes (learned the hard way):
 * - Do NOT use Flarum core classes like Dropdown-menu on the <ul> — core hides
 *   them with display:none unless inside an open .Dropdown.
 * - Use an internal Set (_selectedIds) for O(1) lookup instead of array.some()
 *   on every render; syncs to parent state after each toggle.
 * - All colors reference --chat-accent so they follow the forum theme.
 * - Mithril v2 constructor does NOT receive props — use app.search.neonchat.
 * - NEVER clear this.users on API failure; keep previous data as fallback.
 */
export default class ChatSearchUser {
    constructor(props) {
        this.props = props;
        this.query = '';
        this.hasFocus = false;
        this.loading = true;
        this.users = [];
        this.error = null;
        this.initialLoaded = false;

        // Internal selection tracking — a Set of user ID strings for O(1) lookup.
        // Synced to/from parent (app.search.neonchat.usersSelected) on each toggle.
        this._selectedIds = new Set();

        // Dedup tracker for the user list (avoid duplicate entries that would
        // otherwise propagate into usersSelected and break chat creation).
        this._seenUserIds = {};

        // Start loading immediately
        this.loadUsers();
    }

    loadUsers() {
        if (this.initialLoaded) return;
        this.loading = true;
        this.error = null;
        this.initialLoaded = true;

        const storeUsers = (app.store && app.store.all ? app.store.all('users') : []);
        if (storeUsers && storeUsers.length > 0) {
            this.users = storeUsers.filter(u => u && u !== app.session.user);
            console.log('[ChatSearchUser] loadUsers: using store users, count=' + this.users.length);
            this._loadFromChatApi('');
            return;
        }

        console.log('[ChatSearchUser] loadUsers: store empty, fetching from API');
        this._loadFromChatApi('');
    }

    /**
     * Fetch users from /api/chat-users endpoint.
     *
     * IMPORTANT: On success, we REPLACE self.users (so search results replace
     * the previous list). On FAILURE, we KEEP the existing self.users so the
     * UI doesn't go blank — this is the key fix for "暂无用户".
     */
    _loadFromChatApi(q) {
        var self = this;
        var apiUrl = (app.forum && app.forum.attribute ? app.forum.attribute('apiUrl') : '') || '/api';
        var url = apiUrl + '/chat-users?q=' + encodeURIComponent(q) + '&limit=200';

        console.log('[ChatSearchUser] fetch: ' + url);

        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.setRequestHeader('Accept', 'application/json');

            // Use session cookie auth (same-origin GET needs no extra header).
            // DO NOT set X-CSRF-Token for GET — some Flarum configs reject it.
            // The browser sends cookies automatically for same-origin requests.

            xhr.onload = function () {
                console.log('[ChatSearchUser] XHR status=' + xhr.status + ' q="' + q + '"');

                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        var json = JSON.parse(xhr.responseText);
                        var data = json.data || [];

                        console.log('[ChatSearchUser] API returned ' + data.length + ' users');

                        var newUsers = data.map(function (u) {
                            var attrs = u.attributes || {};
                            var rawId = String(u.id || '');
                            var rawName = attrs.username || attrs.displayName || '';

                            var hash = 0;
                            var hstr = rawId + rawName;
                            for (var i = 0; i < hstr.length; i++) {
                                hash = (hash << 5) - hash + hstr.charCodeAt(i);
                                hash |= 0;
                            }
                            var hue = Math.abs(hash) % 360;
                            var color = 'hsl(' + hue + ', 65%, 45%)';

                            return {
                                id: function () { return rawId; },
                                username: function () { return attrs.username || ''; },
                                displayName: function () { return attrs.displayName || attrs.username || ''; },
                                avatarUrl: function () { return attrs.avatarUrl || ''; },
                                avatarSrcset: function () { return null; },
                                color: function () { return color; },
                                attribute: function (key) { return attrs[key] || null; },
                            };
                        }).filter(function (u) {
                            var id = u.id();
                            if (!id || id === String(app.session.user && app.session.user.id())) return false;
                            if (self._seenUserIds[id]) return false;
                            self._seenUserIds[id] = true;
                            return true;
                        });

                        // Only replace if we got data. If API returned empty (edge case)
                        // keep existing users so UI doesn't show "暂无用户".
                        if (newUsers.length > 0 || !self.users.length) {
                            self.users = newUsers;
                        }
                        // If we had users and API returned empty, silently keep old ones

                        self.error = null;
                    } catch (e) {
                        console.error('[ChatSearchUser] parse error:', e);
                        self.error = 'parse_error';
                        // DON'T clear self.users on parse error!
                    }
                } else {
                    console.warn('[ChatSearchUser] HTTP error: ' + xhr.status);
                    self.error = 'http_' + xhr.status;
                    // DON'T clear self.users on HTTP error!
                }
                self.loading = false;
                m.redraw();
            };
            xhr.onerror = function () {
                console.error('[ChatSearchUser] network error');
                self.error = 'network_error';
                // DON'T clear self.users on network error!
                self.loading = false;
                m.redraw();
            };
            xhr.send();
        } catch (e) {
            console.error('[ChatSearchUser] XHR init error:', e);
            this.error = String(e.message || e);
            this.loading = false;
            m.redraw();
        }
    }

    /**
     * Get the currently selected users array (synced from internal Set).
     */
    getSelected() {
        var sel = [];
        var self = this._selectedIds;
        this.users.forEach(function (u) {
            if (self.has(u.id())) sel.push(u);
        });
        return sel;
    }

    view() {
        var q = (this.query || '').toLowerCase();

        // Filter by query
        var displayed = this.users.filter((user) => {
            if (!user) return false;
            if (user === app.session.user) return false;
            var name = '', display = '';
            try { name = (user.username() || '').toLowerCase(); } catch (e) { }
            try { display = (user.displayName() || '').toLowerCase(); } catch (e) { }
            return name.includes(q) || display.includes(q);
        });

        // Deduplicate by ID
        var seen = {};
        displayed = displayed.filter(function (e) {
            try { var id = e.id(); if (seen[id]) return false; seen[id] = true; return true; }
            catch (ex) { return true; }
        });

        // Sort alphabetically by displayName
        displayed.sort(function (a, b) {
            try { return (a.displayName() || '').localeCompare(b.displayName() || ''); }
            catch (e) { return 0; }
        });

        var selected = this.getSelected();

        return (
            <div className="ChatSearchUser" style={{ boxSizing: 'border-box', overflow: 'hidden', maxWidth: '100%', width: '100%' }}>
                {/* ── Search input ── */}
                <div className="chat-search-input" style={{ boxSizing: 'border-box', overflow: 'hidden', maxWidth: '100%', width: '100%' }}>
                    <span className="chat-search-icon">&#128269;</span>
                    <input
                        className="FormControl"
                        type="search"
                        placeholder={app.translator.trans('xelson-chat.forum.chat.list.add_modal.search.placeholder')}
                        value={this.query}
                        style={{ boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}
                        oninput={(e) => {
                            this.query = e.target.value;
                            var q = (e.target.value || '').trim();
                            if (this._searchTimer) clearTimeout(this._searchTimer);
                            this._searchTimer = setTimeout(() => { this._loadFromChatApi(q); }, 250);
                        }}
                        onfocus={() => { this.hasFocus = true; }}
                        onblur={() => { setTimeout(() => { this.hasFocus = false; }, 200); }}
                    />
                    {this.query ? (
                        <button className="chat-search-clear" onclick={() => {
                            this.query = '';
                            // Clearing search MUST reload the full user list
                            this._loadFromChatApi('');
                        }}>
                            &#10005;
                        </button>
                    ) : null}
                </div>

                {/* ── Results list ── */}
                <ul className="chat-user-results" style={{ boxSizing: 'border-box', overflow: 'hidden', overflowY: 'auto', maxWidth: '100%', width: '100%', margin: 0, padding: 0 }}>
                    {this.loading ? (
                        <li className="chat-result-status chat-result-loading">
                            <LoadingIndicator size="small" />
                            <span>{app.translator.trans('xelson-chat.forum.chat.list.add_modal.search.loading') || '正在加载...'}</span>
                        </li>
                    ) : this.error ? (
                        <li className="chat-result-status chat-result-error">
                            <span>{app.translator.trans('xelson-chat.forum.chat.list.add_modal.search.failed') || '加载失败'}</span>
                            <small>({this.error})</small>
                        </li>
                    ) : displayed.length > 0 ? [
                        displayed.map((user) => {
                            var nameText = '';
                            try { nameText = user.displayName() || user.username() || '?'; } catch (e) { }

                            var uid = '';
                            try { uid = user.id(); } catch (e) { }
                            var isSelected = this._selectedIds.has(uid);

                            return (
                                <li
                                    className={'chat-user-item' + (isSelected ? ' chat-user-selected' : '')}
                                    onclick={() => this.toggleUser(user)}
                                    data-user-id={uid}
                                >
                                    <span className="chat-user-avatar">
                                        {(() => { try { return avatar(user); } catch (e) { return null; }})()}
                                    </span>
                                    <span className="chat-user-info">
                                        <span className="chat-user-name">
                                            {q ? highlight(nameText, q) : nameText}
                                        </span>
                                        <span className="chat-user-username">
                                            @{(function () { try { return user.username(); } catch (e) { return ''; }})()}
                                        </span>
                                    </span>
                                    {isSelected ? (
                                        <span className="chat-user-check">&#10003;</span>
                                    ) : null}
                                </li>
                            );
                        }),
                    ] : (
                        <li className="chat-result-status chat-result-empty">
                            <span>{q
                                ? (app.translator.trans('xelson-chat.forum.chat.list.add_modal.search.failed') || '未找到匹配的用户')
                                : '暂无用户'}</span>
                        </li>
                    )}
                </ul>

                {/* ── Selected users tags ── */}
                {selected.length > 0 ? (
                    <div className="selected-users-section">
                        <div className="UsersTags">
                            {selected.map((user) => {
                                var name = '';
                                try { name = (user.displayName() || user.username() || '?'); } catch (e) { }
                                return (
                                    <div className="UserMention deletable" onclick={() => this.toggleUser(user)}>
                                        <span className="mention-name">{name}</span>
                                        <span className="mention-remove">&#10005;</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </div>
        );
    }

    toggleUser(user) {
        var uid = '';
        try { uid = user.id(); } catch (e) { return; }
        if (!uid) return;

        // Toggle internal Set
        if (this._selectedIds.has(uid)) {
            this._selectedIds.delete(uid);
        } else {
            this._selectedIds.add(uid);
        }

        // Sync to parent state. IMPORTANT: in Mithril v2 the component constructor
        // does NOT receive props (this.props is undefined), so we MUST read the
        // global app.search.neonchat — which is exactly what ChatModal.getSelectedUsers()
        // reads. Relying on this.props.state.neonchat here silently failed (threw,
        // swallowed by try/catch) and the selection never propagated, leaving the
        // "创建" button permanently disabled.
        try {
            if (app.search && app.search.neonchat && Array.isArray(app.search.neonchat.usersSelected)) {
                var parentList = app.search.neonchat.usersSelected;
                // Rebuild parent list from our Set to stay in sync (dedupe by id)
                var newList = [];
                var seen = {};
                var self = this;
                // We need to find the actual user objects from this.users
                this.users.forEach(function (u) {
                    var id = u.id();
                    if (self._selectedIds.has(id) && !seen[id]) {
                        seen[id] = true;
                        newList.push(u);
                    }
                });
                // Replace contents (not reassign) so parent's ref stays valid
                parentList.splice(0, parentList.length);
                newList.forEach(function (u) { parentList.push(u); });
            } else {
                console.warn('[ChatSearchUser] app.search.neonchat unavailable — selection not synced to parent');
            }
        } catch (e) {
            console.warn('[ChatSearchUser] sync to parent failed:', e);
        }

        m.redraw();
    }
}
