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
        // Check if it's a private chat with only one other user
        if (!this.isChannel && this.getSelectedUsers().length === 1) {
            const otherUser = this.getSelectedUsers()[0];
            
            // First check for active chats
            const existingActiveChat = app.chat.findExistingPMChat(app.session.user, otherUser);
            if (existingActiveChat) {
                // If active chat exists, just open it
                app.chat.onChatChanged(existingActiveChat);
                this.hide();
                m.redraw();
                return;
            }
            
            // Then check for chats we've left
            const existingLeftChat = app.chat.findAnyPMChatIncludingLeft(app.session.user, otherUser);
            if (existingLeftChat && existingLeftChat.removed_at()) {
                // If we've left this chat, try to rejoin it by creating with the same users
                this.rejoinExistingChat(existingLeftChat, otherUser);
                return;
            }
        }

        // Proceed with creating new chat
        this.createNewChat();
    }

    rejoinExistingChat(existingChat, otherUser) {
        // Try to rejoin by creating with the same users - backend will handle rejoining
        app.store
            .createRecord('chats')
            .save({
                title: '',
                isChannel: false,
                icon: '',
                color: '',
                relationships: { users: [otherUser, app.session.user] },
            })
            .then((model) => {
                // If successful, add and open the chat
                app.chat.addChat(model);
                app.chat.onChatChanged(model);
                app.alerts.show({ type: 'success' }, 'Rejoined existing chat successfully!');
                m.redraw();
            })
            .catch((error) => {
                console.error('Error rejoining chat:', error);
                // If rejoin fails, open the existing chat anyway (if it's in our list)
                const chatInList = app.chat.getChats().find(c => c.id() === existingChat.id());
                if (chatInList) {
                    app.chat.onChatChanged(chatInList);
                    app.alerts.show({ type: 'success' }, 'Opened existing chat.');
                } else {
                    // Show more helpful error message
                    app.alerts.show({ type: 'error' }, 'Unable to rejoin chat. Please search for the user manually.');
                }
                m.redraw();
            });
        this.hide();
    }

    createNewChat() {
        app.store
            .createRecord('chats')
            .save({
                title: this.getInput().title(),
                isChannel: this.isChannel,
                icon: this.getInput().icon(),
                color: this.getInput().color(),
                relationships: { users: [...this.getSelectedUsers(), app.session.user] },
            })
            .then((model) => {
                app.chat.addChat(model);
                app.chat.onChatChanged(model);
                m.redraw();
            })
            .catch((error) => {
                console.error('Error creating chat:', error);
                // Show more helpful error message based on error type
                if (error.status === 400) {
                    app.alerts.show({ type: 'error' }, 'This chat already exists. Please search for the user manually.');
                } else {
                    app.alerts.show({ type: 'error' }, 'Failed to create chat. Please try again.');
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
