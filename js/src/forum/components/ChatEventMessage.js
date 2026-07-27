import ChatMessage from './ChatMessage';
import Link from 'flarum/common/components/Link';
import extractText from 'flarum/common/utils/extractText';
import humanTime from 'flarum/common/helpers/humanTime';
import fullTime from 'flarum/common/helpers/fullTime';

export default class ChatEventMessage extends ChatMessage {
    oninit(vnode) {
        super.oninit(vnode);

        try {
            if (
                this.model
                    .message()
                    .split('')
                    .every((c) => c === '*')
            )
                this.parsedContent = { id: 'chatCensored' };
            else this.parsedContent = JSON.parse(this.model.message());
        } catch (e) {
            console.warn('[ChatEventMessage] failed to parse event message:', e);
            this.parsedContent = { id: 'unknown' };
        }
    }

    /**
     * DEFENSIVE: user may be undefined/false — e.g. app.store.getById('users', id)
     * returns undefined when the referenced user was never loaded into the store
     * (fresh PM chat where the other user has no posts), or a deleted user.
     * Calling app.route.user(undefined) crashes on `.slug` and takes down the
     * ENTIRE Mithril render tree — chat goes blank, sending breaks, DOM corrupts.
     */
    componentUserMention(user) {
        if (!user || typeof user.displayName !== 'function') {
            return <span className="UserMention UserMention--deleted">@?</span>;
        }
        try {
            return (
                <Link href={app.route.user(user)}>
                    <span className="UserMention">{user.displayName()}</span>
                </Link>
            );
        } catch (e) {
            return <span className="UserMention">{(user.displayName && user.displayName()) || '?'}</span>;
        }
    }

    componentUserMentionsByIds(ids) {
        if (!Array.isArray(ids)) return [];
        return ids.map((id) => this.componentUserMention(app.store.getById('users', id)));
    }

    componentEventText() {
        switch (this.parsedContent.id) {
            case 'chatCensored': {
                return (
                    <div className="censored" title={app.translator.trans('xelson-chat.forum.chat.message.censored')}>
                        {this.model.message()}
                    </div>
                );
            }
            case 'chatCreated': {
                if (!this.model.chat()) return;

                if (this.model.chat().type() == 1) {
                    return app.translator.trans(`xelson-chat.forum.chat.message.events.channel.created`, {
                        creatorname: this.componentUserMention(this.model.user()),
                        chatname: <b className="chat-title">{this.model.chat().title()}</b>,
                    });
                } else {
                    if (this.model.chat().type() == 0 && this.model.chat().users().length <= 2) {
                        return app.translator.trans(`xelson-chat.forum.chat.message.events.pm.created`, {
                            creatorname: this.componentUserMention(this.model.chat().creator()),
                            username: this.parsedContent.users.length
                                ? this.componentUserMention(app.store.getById('users', this.parsedContent.users[0]))
                                : null,
                        });
                    }

                    return app.translator.trans(`xelson-chat.forum.chat.message.events.chat.created`, {
                        creatorname: this.componentUserMention(this.model.user()),
                        chatname: <b className="chat-title">{this.model.chat().title()}</b>,
                        usernames: this.componentUserMentionsByIds(this.parsedContent.users),
                        username: this.parsedContent.users.length
                            ? this.componentUserMention(app.store.getById('users', this.parsedContent.users[0]))
                            : null,
                    });
                }
            }
            case 'chatEdited': {
                let componentOld, componentNew;
                switch (this.parsedContent.column) {
                    case 'title':
                        componentOld = <b className="chat-title">{this.parsedContent.old}</b>;
                        componentNew = <b className="chat-title">{this.parsedContent.new}</b>;
                        break;

                    case 'color':
                        componentOld = <i className="fas fa-circle" style={{ color: this.parsedContent.old }}></i>;
                        componentNew = <i className="fas fa-circle" style={{ color: this.parsedContent.new }}></i>;
                        break;

                    case 'icon':
                        componentOld = this.parsedContent.old ? <i className={this.parsedContent.old}></i> : <b>[nothing]</b>;
                        componentNew = <i className={this.parsedContent.new}></i>;
                        break;
                }

                return app.translator.trans(`xelson-chat.forum.chat.message.events.${this.parsedContent.column}.edited`, {
                    editorname: this.componentUserMention(this.model.user()),
                    old: componentOld,
                    new: componentNew,
                });
            }
            case 'chatAddRemoveUser': {
                const add = Array.isArray(this.parsedContent.add) ? this.parsedContent.add : [];
                const remove = Array.isArray(this.parsedContent.remove) ? this.parsedContent.remove : [];
                const selfUser = this.model.user();
                const selfId = selfUser && typeof selfUser.id === 'function' ? selfUser.id() : null;

                if (add.length && remove.length) {
                    return app.translator.trans('xelson-chat.forum.chat.message.events.users.invited_kicked', {
                        editorname: this.componentUserMention(selfUser),
                        invitednames: this.componentUserMentionsByIds(add),
                        kickednames: this.componentUserMentionsByIds(remove),
                    });
                } else if (add.length) {
                    if (selfId !== null && add[0] == selfId) {
                        return app.translator.trans('xelson-chat.forum.chat.message.events.self.entered', {
                            username: this.componentUserMention(selfUser),
                        });
                    } else {
                        return app.translator.trans('xelson-chat.forum.chat.message.events.users.invited', {
                            editorname: this.componentUserMention(selfUser),
                            usernames: this.componentUserMentionsByIds(add),
                        });
                    }
                } else if (remove.length) {
                    if (selfId !== null && remove[0] == selfId) {
                        return app.translator.trans('xelson-chat.forum.chat.message.events.self.leaved', {
                            username: this.componentUserMention(selfUser),
                        });
                    } else {
                        return app.translator.trans('xelson-chat.forum.chat.message.events.users.kicked', {
                            editorname: this.componentUserMention(selfUser),
                            usernames: this.componentUserMentionsByIds(remove),
                        });
                    }
                }
            }
        }
    }

    content() {
        // Wrap in try/catch: a single malformed event message must NEVER take
        // down the whole chat render tree (blank chat + broken sending).
        let eventText;
        try {
            eventText = this.componentEventText();
        } catch (e) {
            console.warn('[ChatEventMessage] render error (suppressed):', e);
            eventText = null;
        }
        return (
            <div className="event">
                {eventText}
                <a className="timestamp" title={extractText(fullTime(this.model.created_at()))}>
                    {(this.humanTime = humanTime(this.model.created_at()))}
                </a>
            </div>
        );
    }
}
