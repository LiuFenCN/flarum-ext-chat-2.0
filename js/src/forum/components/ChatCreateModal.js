import Button from 'flarum/common/components/Button';
import classList from 'flarum/common/utils/classList';

import ChatSearchUser from './ChatSearchUser';
import ChatModal from './ChatModal';
import Stream from 'flarum/common/utils/Stream';

export default class ChatCreateModal extends ChatModal {
    oninit(vnode) {
        super.oninit(vnode);

        this.isChannel = false;
    }

    title() {
        return app.translator.trans('xelson-chat.forum.chat.list.add_modal.title');
    }

    onsubmit() {
        // Validate that we have selected users
        var selected = this.getSelectedUsers();
        console.log('[ChatCreateModal] onsubmit, selectedUsers.length=', selected.length, 'isChannel=', this.isChannel);

        if (!selected || selected.length === 0) {
            app.alerts.show({ type: 'error' }, '请先选择至少一个用户');
            return;
        }

        // Check if it's a private chat with only one other user
        if (!this.isChannel && selected.length === 1) {
            const otherUser = selected[0];

            // First check for active chats
            const existingActiveChat = app.chat.findExistingPMChat(app.session.user, otherUser);
            if (existingActiveChat) {
                app.chat.onChatChanged(existingActiveChat);
                this.hide();
                m.redraw();
                return;
            }

            // Then check for chats we've left
            const existingLeftChat = app.chat.findAnyPMChatIncludingLeft(app.session.user, otherUser);
            if (existingLeftChat && existingLeftChat.removed_at()) {
                this.rejoinExistingChat(existingLeftChat, otherUser);
                return;
            }
        }

        // Proceed with creating new chat
        this.createNewChat();
    }

    /**
     * Convert user objects (lightweight wrappers from ChatSearchUser or real Mithril models)
     * into JSON:API identifier format { type: 'users', id: '...' } that Flarum's
     * serializer expects inside relationships.
     */
    toUserIdentifiers(userObjs) {
        var ids = [];
        for (var i = 0; i < userObjs.length; i++) {
            var u = userObjs[i];
            try {
                var uid = (typeof u.id === 'function') ? u.id() : (u.id || '');
                if (uid) ids.push({ type: 'users', id: String(uid) });
            } catch (e) {
                console.warn('[ChatCreateModal] skipping invalid user:', e);
            }
        }
        return ids;
    }

    rejoinExistingChat(existingChat, otherUser) {
        var userIds = this.toUserIdentifiers([otherUser]);
        userIds.push({ type: 'users', id: String(app.session.user.id()) });

        console.log('[ChatCreateModal] rejoinExistingChat, userIds=', JSON.stringify(userIds));

        app.store
            .createRecord('chats')
            .save({
                title: '',
                isChannel: false,
                icon: '',
                color: '',
                relationships: { users: userIds },
            })
            .then((model) => {
                app.chat.addChat(model);
                app.chat.onChatChanged(model);
                app.alerts.show({ type: 'success' }, '已重新加入聊天！');
                m.redraw();
            })
            .catch((error) => {
                console.error('[ChatCreateModal] rejoin error:', error);
                var chatInList = app.chat.getChats().find(function(c) { return c.id() === existingChat.id(); });
                if (chatInList) {
                    app.chat.onChatChanged(chatInList);
                    app.alerts.show({ type: 'success' }, '已打开已有聊天');
                } else {
                    app.alerts.show({ type: 'error' }, '无法重新加入聊天，请稍后重试');
                }
                m.redraw();
            });
        this.hide();
    }

    createNewChat() {
        var selected = this.getSelectedUsers();
        var userIds = this.toUserIdentifiers(selected);
        // Add current user — backend also re-adds actor but we include it for clarity
        userIds.push({ type: 'users', id: String(app.session.user.id()) });

        console.log('[ChatCreateModal] createNewChat, userIds=', JSON.stringify(userIds), 'isChannel=', this.isChannel);

        app.store
            .createRecord('chats')
            .save({
                title: this.getInput().title() || '',
                isChannel: this.isChannel,
                icon: this.getInput().icon() || '',
                color: this.getInput().color() || '',
                relationships: { users: userIds },
            })
            .then((model) => {
                console.log('[ChatCreateModal] chat created, id=', model.id());
                app.chat.addChat(model);
                app.chat.onChatChanged(model);
                m.redraw();
            })
            .catch((error) => {
                console.error('[ChatCreateModal] create error:', error.status, error.message || error);
                if (error.status === 400 || error.status === 422) {
                    app.alerts.show({ type: 'error' }, '该聊天已存在，或参数有误');
                } else {
                    app.alerts.show({ type: 'error' }, '创建失败（' + (error.status || '?') + '），请重试');
                }
            });
        this.hide();
    }

    componentFormInputColor() {
        return this.componentFormColor({
            title: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.color.label'),
            desc: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.color.validator'),
            stream: this.getInput().color,
            placeholder: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.color.label'),
        });
    }

    componentFormInputIcon() {
        return this.componentFormIcon({
            title: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.icon.label'),
            desc: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.icon.validator', {
                a: <a href="https://fontawesome.com/icons?m=free" tabindex="-1" target="blank" />,
            }),
            stream: this.getInput().icon,
            placeholder: 'fas fa-bolt',
        });
    }

    componentFormChat() {
        return [
            this.usersSelected.length > 1
                ? [
                      this.componentFormInput({
                          title: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.title.chat'),
                          desc: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.title.validator'),
                          stream: this.getInput().title,
                          placeholder: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.title.chat'),
                      }),
                      this.componentFormInputColor(),
                      this.componentFormInputIcon(),
                  ]
                : null,
            this.componentFormUsersSelect(),
        ];
    }

    componentFormChannel() {
        return [
            this.componentFormInput({
                title: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.title.channel'),
                desc: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.title.validator'),
                stream: this.getInput().title,
                placeholder: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.title.channel'),
            }),
            this.componentFormInputColor(),
            this.componentFormInputIcon(),
        ];
    }

    isCanCreateChat() {
        if (this.getSelectedUsers().length > 1 && !this.getInput().title().length) return false;
        if (!this.getSelectedUsers().length) return false;
        if (this.alertText()) return false;

        return true;
    }

    isCanCreateChannel() {
        return this.getInput().title().length;
    }

    content() {
        return (
            <div className="Modal-body">
                <div class="Form-group InputTitle">
                    {app.chat.getPermissions().create.channel ? (
                        <div className="ChatType">
                            <div
                                className={classList({ 'Tab Tab--left': true, 'Tab--active': !this.isChannel })}
                                onclick={(() => (this.isChannel = false)).bind(this)}
                            >
                                {app.translator.trans('xelson-chat.forum.chat.list.add_modal.chat')}
                            </div>
                            <div
                                className={classList({ 'Tab Tab--right': true, 'Tab--active': this.isChannel })}
                                onclick={(() => (this.isChannel = true)).bind(this)}
                            >
                                {app.translator.trans('xelson-chat.forum.chat.list.add_modal.channel')}
                            </div>
                        </div>
                    ) : null}
                    {this.isChannel ? this.componentFormChannel() : this.componentFormChat()}
                    <div className="ButtonsPadding"></div>
                    <Button
                        className="Button Button--primary Button--block"
                        disabled={this.isChannel ? !this.isCanCreateChannel() : !this.isCanCreateChat()}
                        onclick={this.onsubmit.bind(this)}
                    >
                        {app.translator.trans('xelson-chat.forum.chat.list.add_modal.create.' + (this.isChannel ? 'channel' : 'chat'))}
                    </Button>
                </div>
            </div>
        );
    }
}
