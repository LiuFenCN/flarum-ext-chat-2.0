import Component from 'flarum/common/Component';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';

import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import ChatEventMessage from './ChatEventMessage';
import ChatWelcome from './ChatWelcome';
import Message from '../models/Message';
import timedRedraw from '../utils/timedRedraw';
import ChatPage from './ChatPage';

export default class ChatViewport extends Component {
    oninit(vnode) {
        super.oninit(vnode);

        this.model = this.attrs.chatModel;
        if (this.model) {
            this.state = app.chat.getViewportState(this.model);
        }
    }

    oncreate(vnode) {
        super.oncreate(vnode);
        this.loadChat();

        // Real-time fallback: Pusher is not configured on this site, so messages
        // sent by others don't arrive automatically. Poll the current chat every
        // few seconds so new messages appear in the viewport without a manual page
        // refresh. apiFetchChatMessages dedupes by id, so re-fetching is safe.
        this._pollTimer = setInterval(() => {
            if (this.model && app.chat && app.chat.chatIsShown()) {
                app.chat.apiFetchChatMessages(this.model).then(() => {
                    let list = app.chat.getChatMessages((mdl) => mdl.chat() == this.model);
                    if (list.length) {
                        let latest = list[list.length - 1];
                        if (latest && this.model.last_message() != latest) {
                            this.model.pushData({ relationships: { last_message: latest } });
                        }
                    }
                });
            }
        }, 5000);
    }

    onremove(vnode) {
        super.onremove(vnode);
        if (this._pollTimer) clearInterval(this._pollTimer);
    }

    onupdate(vnode) {
        super.onupdate(vnode);

        // this.attrs is broken in onupdate hook
        const model = vnode.attrs.chatModel;

        if (model !== this.model) {
            this.model = model;
            if (this.model) {
                this.state = app.chat.getViewportState(this.model);
                this.loadChat();
            }
            app.chat.flashItem($('.wrapper'));
        }
    }

    loadChat() {
        if (!this.state) return;

        const oldScroll = this.state.scroll.oldScroll;
        this.reloadMessages();
        m.redraw();

        setTimeout(() => {
            const element = this.element;
            const chatWrapper = this.getChatWrapper();
            
            if (element && chatWrapper && element.scrollHeight !== undefined && element.clientHeight !== undefined) {
                chatWrapper.scrollTop = element.scrollHeight - element.clientHeight - oldScroll;
            }
        }, 200);
    }

    view(vnode) {
        if (this.model) {
            return (
                <div className="ChatViewport">
                    <div
                        className="wrapper"
                        oncreate={this.wrapperOnCreate.bind(this)}
                        onbeforeupdate={this.wrapperOnBeforeUpdate.bind(this)}
                        onupdate={this.wrapperOnUpdate.bind(this)}
                        onremove={this.wrapperOnRemove.bind(this)}
                    >
                        {this.componentLoader(this.state.scroll.loading)}
                        {this.componentsChatMessages(this.model).concat(
                            this.state.input.writingPreview ? this.componentChatMessage(this.state.input.previewModel) : []
                        )}
                    </div>
                    <ChatInput
                        state={this.state}
                        model={this.model}
                        oninput={() => {
                            if (this.nearBottom() && !this.state.messageEditing) {
                                this.scrollToBottom();
                            }
                        }}
                    ></ChatInput>
                    {this.isFastScrollAvailable() ? this.componentScroller() : null}
                </div>
            );
        }

        return (
            <div className="ChatViewport">
                <ChatWelcome />;
            </div>
        );
    }

    componentChatMessage(model) {
        // Flarum's save() only treats `undefined` id as "new", so the live-preview
        // message has its id cleared to undefined before being sent. Give it a
        // stable synthetic key so the message list fragment stays consistently
        // keyed — mixing keyed and unkeyed vnodes throws "fragments keys".
        const key = model.id() != null ? model.id() : model._renderKey;
        return model.type() ? <ChatEventMessage key={key} model={model} /> : <ChatMessage key={key} model={model} />;
    }

    componentsChatMessages(chat) {
        return app.chat.getChatMessages().map((model) => this.componentChatMessage(model));
    }

    componentScroller() {
        return (
            <div className="scroller" onclick={this.fastScroll.bind(this)}>
                <i class="fas fa-angle-down"></i>
            </div>
        );
    }

    componentLoader(watch) {
        return watch ? (
            <msgloader className="message-wrapper--loading">
                <LoadingIndicator className="loading-old Button-icon" />
            </msgloader>
        ) : null;
    }
    getChatWrapper() {
        if (app.screen() === 'phone' && app.current.matches(ChatPage)) {
            return document.documentElement;
        }
        const wrapper = document.querySelector('.ChatViewport .wrapper');
        return wrapper || null;
    }

    isFastScrollAvailable() {
        if (!this.state || !this.model) return false;
        let chatWrapper = this.getChatWrapper();
        if (!chatWrapper) return false;
        
        return (
            (this.state.newPushedPosts ||
                this.model.unreaded() >= 30 ||
                (chatWrapper.scrollHeight > 2000 && chatWrapper.scrollTop < chatWrapper.scrollHeight - 2000)) &&
            !this.nearBottom()
        );
    }

    fastScroll(e) {
        if (!this.model) return;
        if (this.model.unreaded() >= 30) this.fastMessagesFetch(e);
        else {
            let chatWrapper = this.getChatWrapper();
            if (chatWrapper) {
                chatWrapper.scrollTop = Math.max(chatWrapper.scrollTop, chatWrapper.scrollHeight - 3000);
                this.scrollToBottom();
            }
        }
    }

    fastMessagesFetch(e) {
        e.redraw = false;
        app.chat.chatmessages = [];

        app.chat.apiFetchChatMessages(this.model).then((r) => {
            this.scrollToBottom();
            timedRedraw(300);

            this.model.pushAttributes({ unreaded: 0 });
            let message = app.chat.getChatMessages((mdl) => mdl.chat() == this.model).slice(-1)[0];
            app.chat.apiReadChat(this.model, message);
        });
    }

    wrapperOnCreate(vnode) {
        super.oncreate(vnode);
        this.wrapperOnUpdate(vnode);

        (app.current.matches(ChatPage) ? window : vnode.dom).addEventListener(
            'scroll',
            (this.boundScrollListener = this.wrapperOnScroll.bind(this)),
            { passive: true }
        );
    }

    wrapperOnBeforeUpdate(vnode, vnodeNew) {
        try {
            super.onbeforeupdate(vnode, vnodeNew);
            if (!this.state || !this.state.autoScroll || !this.nearBottom() || !this.state.newPushedPosts) {
                return;
            }
            this.scrollAfterUpdate = true;
        } catch (e) {
            console.warn('ChatViewport wrapperOnBeforeUpdate error:', e);
        }
    }

    wrapperOnUpdate(vnode) {
        try {
            super.onupdate(vnode);
            let el = vnode.dom;
            if (!el) return;
            
            if (this.model && this.state && this.state.scroll.autoScroll) {
                if (this.autoScrollTimeout) clearTimeout(this.autoScrollTimeout);
                this.autoScrollTimeout = setTimeout(this.scrollToBottom.bind(this, true), 100);
            }
            if (el.scrollTop <= 0) el.scrollTop = 1;
            this.checkUnreaded();

            if (this.scrollAfterUpdate) {
                this.scrollAfterUpdate = false;
                this.scrollToBottom();
            }
        } catch (e) {
            console.warn('ChatViewport wrapperOnUpdate error:', e);
        }
    }

    wrapperOnRemove(vnode) {
        try {
            super.onremove(vnode);
            if (this.boundScrollListener && vnode.dom) {
                vnode.dom.removeEventListener('scroll', this.boundScrollListener);
            }
        } catch (e) {
            console.warn('ChatViewport wrapperOnRemove error:', e);
        }
    }

    wrapperOnScroll(e) {
        const el = app.current.matches(ChatPage) ? document.documentElement : this.element;
        if (!el || !this.state) return;

        this.state.scroll.oldScroll = el.scrollHeight - el.clientHeight - el.scrollTop;

        this.checkUnreaded();

        if (this.lastFastScrollStatus != this.isFastScrollAvailable()) {
            this.lastFastScrollStatus = this.isFastScrollAvailable();
            m.redraw();
        }

        let currentHeight = el.scrollHeight;

        if (this.atBottom()) {
            this.state.newPushedPosts = false;
        }

        if (this.state.scroll.autoScroll || this.state.loading || this.scrolling) return;

        if (!this.state.messageEditing && el.scrollTop >= 0) {
            if (el.scrollTop <= 500) {
                let topMessage = app.chat.getChatMessages((model) => model.chat() == this.model)[0];
                if (topMessage && topMessage != this.model.first_message() && topMessage.id()) {
                    // Pass the message ID (not a date string) as the cursor:
                    // MessageResource.scope() treats `query` as a numeric id and
                    // returns messages OLDER than it (scroll-up history).
                    app.chat.apiFetchChatMessages(this.model, topMessage.id());
                }
            } else if (el.scrollTop + el.offsetHeight >= currentHeight - 500) {
                let bottomMessage = app.chat.getChatMessages((model) => model.chat() == this.model).slice(-1)[0];
                if (bottomMessage && bottomMessage != this.model.last_message() && bottomMessage.id()) {
                    // Newer messages are picked up by the 5s poll. Re-fetch the
                    // newest page (no cursor) so dedup refreshes the tail.
                    app.chat.apiFetchChatMessages(this.model);
                }
            }
        }
    }

    checkUnreaded() {
        let wrapper = this.getChatWrapper();
        if (wrapper && this.model && this.model.unreaded() && app.chat.chatIsShown()) {
            let list = app.chat.getChatMessages((mdl) => mdl.chat() == this.model && mdl.created_at() >= this.model.readed_at() && !mdl.isReaded);

            for (const message of list) {
                let msg = document.querySelector(`.message-wrapper[data-id="${message.id()}"]`);
                if (msg && wrapper.scrollTop + wrapper.offsetHeight >= msg.offsetTop) {
                    message.isReaded = true;

                    if (this.state.scroll.autoScroll && app.chat.getCurrentChat() == this.model) {
                        app.chat.apiReadChat(this.model, new Date());
                        this.model.pushAttributes({ unreaded: 0 });
                    } else {
                        app.chat.apiReadChat(this.model, message);
                        this.model.pushAttributes({ unreaded: this.model.unreaded() - 1 });
                    }

                    m.redraw();
                }
            }
        }
    }

    scrollToAnchor(anchor) {
        let element;
        if (anchor instanceof Message) element = $(`.message-wrapper[data-id="${anchor.id()}"`)[0];
        else element = anchor;

        let chatWrapper = this.getChatWrapper();
        if (chatWrapper && element)
            $(chatWrapper)
                .stop()
                .animate({ scrollTop: element.offsetTop - element.offsetHeight }, 500);
        else setTimeout(scroll, 100);
    }

    scrollToBottom(force = false) {
        this.scrolling = true;
        let chatWrapper = this.getChatWrapper();
        if (chatWrapper) {
            const notAtBottom = !force && this.atBottom();
            let fewMessages = false;
            if (app.current.matches(ChatPage)) {
                const wrapper = document.querySelector('.ChatViewport .wrapper');
                fewMessages = wrapper && wrapper.scrollHeight + 200 < document.documentElement.clientHeight;
            }
            if (notAtBottom || fewMessages) return;

            const time = this.pixelsFromBottom() < 80 ? 0 : 250;

            $(chatWrapper)
                .stop()
                .animate({ scrollTop: chatWrapper.scrollHeight }, time, 'swing', () => {
                    if (this.state) {
                        this.state.scroll.autoScroll = false;
                    }
                    this.scrolling = false;
                });
        }
    }

    reloadMessages() {
        if (!this.state.messagesFetched) {
            let query;
            if (this.model.unreaded()) {
                query = this.model.readed_at()?.toISOString() ?? new Date(0).toISOString();
                this.state.scroll.autoScroll = false;
            }

            app.chat.apiFetchChatMessages(this.model, query).then(() => {
                if (this.model.unreaded()) {
                    let anchor = app.chat.getChatMessages((mdl) => mdl.chat() == this.model && mdl.created_at() > this.model.readed_at())[0];
                    this.scrollToAnchor(anchor);
                } else this.state.scroll.autoScroll = true;

                m.redraw();
            });

            this.state.messagesFetched = true;
        }
    }

    nearBottom() {
        try {
            return this.pixelsFromBottom() <= 500;
        } catch (e) {
            return false;
        }
    }

    atBottom() {
        try {
            return this.pixelsFromBottom() <= 5;
        } catch (e) {
            return false;
        }
    }

    pixelsFromBottom() {
        const element = app.current.matches(ChatPage) ? document.documentElement : this.element;
        if (!element || element.scrollHeight === undefined || element.scrollTop === undefined || element.clientHeight === undefined) {
            return 0;
        }
        return Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight);
    }
}
