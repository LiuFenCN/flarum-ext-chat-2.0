import Button from 'flarum/common/components/Button';
import Dropdown from 'flarum/common/components/Dropdown';
import classList from 'flarum/common/utils/classList';
import Model from 'flarum/common/Model';
import Group from 'flarum/common/models/Group';

import ChatModal from './ChatModal';
import Stream from 'flarum/common/utils/Stream';

export default class ChatEditModal extends ChatModal {
    oninit(vnode) {
        super.oninit(vnode);

        this.getInput().title = Stream(this.model.title());
        this.getInput().color = Stream(this.model.color());
        this.getInput().icon = Stream(this.model.icon());

        this.deleteChatTitleInput = Stream('');
        this.deleteState = 0;

        this.initialUsers = this.model.users().filter((mdl) => !mdl.chat_pivot(this.model.id()).removed_at());
        this.setSelectedUsers(this.model.users().filter((mdl) => !mdl.chat_pivot(this.model.id()).removed_at()));
        this.edited = {};

        this.isLocalModerator = this.isModer(app.session.user);
        this.isLocalLeaved = !this.initialUsers.includes(app.session.user);

        // Creator-leave state machine:
        // null       → normal leave button (just leaves)
        // 'confirm'  → show 3 options (transfer / disband / cancel)
        // 'transfer' → show user picker for ownership transfer
        this.leaveState = null;
        this.transferTarget = null;
    }

    title() {
        return app.translator.trans('xelson-chat.forum.chat.edit_modal.title');
    }

    className() {
        return 'ChatModal Modal--medium';
    }

    onsubmit() {
        let added = this.getSelectedUsers()
            .map((mdl) => (!this.initialUsers.includes(mdl) ? Model.getIdentifier(mdl) : null))
            .filter((e) => e);
        let removed = this.initialUsers.map((mdl) => (!this.getSelectedUsers().includes(mdl) ? Model.getIdentifier(mdl) : null)).filter((e) => e);
        let edited = Object.keys(this.edited).map((k) => (this.edited[k] = { id: k, ...this.edited[k] }));

        this.model.save({
            title: this.getInput().title(),
            color: this.getInput().color(),
            icon: this.getInput().icon(),
            users: { added, removed, edited },
            relationships: { users: this.getSelectedUsers() },
        });

        this.hide();
    }

    alertText() {
        return null;
    }

    isModer(user) {
        if (!user) return false;
        if (this.edited[user.id()]?.role ?? user.chat_pivot(this.model.id()).role()) return true;
        if (this.isCreator(user)) return true;

        return false;
    }

    isCreator(user) {
        return (
            user.chat_pivot(this.model.id()).role() == 2 ||
            (!this.model.creator() && user.groups() && user.groups().some((g) => g.id() == Group.ADMINISTRATOR_ID))
        );
    }

    userMentionClassname(user) {
        return classList({ editable: true, moder: this.isModer(user), creator: this.isCreator(user) });
    }

    userMentionDropdownOnclick(user, button) {
        switch (button) {
            case 'moder': {
                if (this.isModer(user)) this.edited[user.id()] = { role: 0 };
                else this.edited[user.id()] = { role: 1 };

                break;
            }
            case 'kick': {
                this.getSelectedUsers().splice(this.getSelectedUsers().indexOf(user), 1);
                break;
            }
        }
    }

    componentUserMentionDropdown(user) {
        return (
            <Dropdown
                buttonClassName="Button Button--icon Button--flat Button--mention-edit"
                menuClassName="Dropdown-menu--top Dropdown-menu--bottom Dropdown-menu--left Dropdown-menu--right"
                icon="fas fa-chevron-down"
            >
                <Button
                    icon={this.isModer(user) ? 'fas fa-times' : 'fas fa-users-cog'}
                    onclick={this.userMentionDropdownOnclick.bind(this, user, 'moder')}
                    disabled={user == app.session.user || !this.isCreator(app.session.user) || this.isCreator(user)}
                >
                    {app.translator.trans('xelson-chat.forum.chat.moder')}
                </Button>
                <Button
                    icon="fas fa-trash-alt"
                    onclick={this.userMentionDropdownOnclick.bind(this, user, 'kick')}
                    disabled={user.chat_pivot(this.model.id()).role() >= this.isLocalModerator && user != app.session.user}
                >
                    {app.translator.trans(`xelson-chat.forum.chat.${user == app.session.user ? 'leave' : 'kick'}`)}
                </Button>
            </Dropdown>
        );
    }

    userMentionContent(user) {
        return ['@' + user.displayName(), this.isLocalModerator && !app.chat.isChatPM(this.model) ? this.componentUserMentionDropdown(user) : null];
    }

    userMentionOnClick(user, e) {
        this.$(e.target).find('.Dropdown').trigger('shown.bs.dropdown');
    }

    componentFormInputIcon() {
        return this.componentFormIcon({
            title: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.icon.label'),
            desc: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.icon.validator', {
                a: <a href="https://fontawesome.com/icons?m=free" tabindex="-1" target="blank" />,
            }),
            stream: this.getInput().icon,
            placeholder: 'fas fa-bolt',
        });
    }

    componentFormInputTitle() {
        return this.componentFormInput({
            title: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.title.label'),
            desc: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.title.validator'),
            stream: this.getInput().title,
            placeholder: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.title.label'),
        });
    }

    componentFormInputColor() {
        return this.componentFormColor({
            title: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.color.label'),
            desc: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.color.validator'),
            stream: this.getInput().color,
            placeholder: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.color.label'),
        });
    }

    componentChatInfo() {
        return [
            <label>
                <h2>{this.model.title()}</h2>
            </label>,
            this.componentUsersMentions(),
        ];
    }

    componentFormPM() {
        return this.componentChatInfo();
    }

    componentFormChannel() {
        return this.isLocalModerator
            ? [
                  this.componentFormInputTitle(),
                  this.componentFormInputColor(),
                  this.componentFormInputIcon(),
                  this.componentFormUsersSelect('xelson-chat.forum.chat.edit_modal.form.users.edit'),
              ]
            : this.componentChatInfo();
    }

    componentFormChat() {
        return this.isLocalModerator
            ? [this.componentFormInputTitle(), this.componentFormInputColor(), this.componentFormInputIcon(), this.componentFormUsersSelect()]
            : this.componentChatInfo();
    }

    componentForm() {
        if (this.model.type()) return this.componentFormChannel();
        if (app.chat.isChatPM(this.model)) return this.componentFormPM();

        return this.componentFormChat();
    }

    componentFormButtons() {
        // Creator-leave flow: show options panel instead of normal buttons
        if (this.leaveState === 'confirm') {
            return this.componentCreatorLeaveConfirm();
        }
        if (this.leaveState === 'transfer') {
            return this.componentCreatorLeaveTransfer();
        }

        let buttons = [];

        if (this.isLocalModerator && !app.chat.isChatPM(this.model))
            buttons.push(
                <Button
                    className="Button Button--primary Button--block ButtonSave"
                    onclick={this.onsubmit.bind(this)}
                    disabled={this.model.type() ? !this.isCanEditChannel() : !this.isCanEditChat()}
                >
                    {app.translator.trans('xelson-chat.forum.chat.edit_modal.save_button')}
                </Button>
            );

        buttons.push(
            <Button
                className="Button Button--primary Button--block ButtonLeave"
                onclick={this.onleave.bind(this)}
                disabled={this.model.removed_by() && this.model.removed_by() != app.session.user.id()}
            >
                {app.translator.trans(`xelson-chat.forum.chat.edit_modal.form.${this.isLocalLeaved ? 'return' : 'leave'}`)}
            </Button>
        );

        if (!app.chat.isChatPM(this.model) && app.chat.getPermissions().create.channel) buttons.push(this.componentDeleteChat());

        return buttons;
    }

    getTransferCandidates() {
        // Return active users excluding current user
        return (this.model.users() || []).filter((u) => {
            if (!u) return false;
            if (u.id() == app.session.user.id()) return false;
            const pivot = u.chat_pivot(this.model.id());
            if (!pivot) return false;
            return !pivot.removed_at();
        });
    }

    componentCreatorLeaveConfirm() {
        return (
            <div className="creator-leave-panel">
                <label className="creator-leave-label">
                    {app.translator.trans('xelson-chat.forum.chat.edit_modal.creator_leave.title')}
                </label>
                <Button className="Button Button--primary Button--block" onclick={() => { this.leaveState = 'transfer'; this.transferTarget = null; m.redraw(); }}>
                    {app.translator.trans('xelson-chat.forum.chat.edit_modal.creator_leave.transfer')}
                </Button>
                <Button className="Button Button--danger Button--block" onclick={() => this.doDisband()}>
                    {app.translator.trans('xelson-chat.forum.chat.edit_modal.creator_leave.disband')}
                </Button>
                <Button className="Button Button--flat Button--block" onclick={() => { this.leaveState = null; m.redraw(); }}>
                    {app.translator.trans('xelson-chat.forum.chat.edit_modal.creator_leave.cancel')}
                </Button>
            </div>
        );
    }

    componentCreatorLeaveTransfer() {
        const candidates = this.getTransferCandidates();

        return (
            <div className="creator-leave-panel">
                <label className="creator-leave-label">
                    {app.translator.trans('xelson-chat.forum.chat.edit_modal.creator_leave.select_owner')}
                </label>
                <div className="transfer-user-list">
                    {candidates.length === 0 ? (
                        <p className="transfer-user-empty">
                            {app.translator.trans('xelson-chat.forum.chat.edit_modal.creator_leave.no_users')}
                        </p>
                    ) : candidates.map((user) => {
                        const isSelected = this.transferTarget && this.transferTarget.id() === user.id();
                        return (
                            <div
                                className={'transfer-user-item' + (isSelected ? ' selected' : '')}
                                onclick={() => { this.transferTarget = user; m.redraw(); }}
                            >
                                <span className="transfer-user-avatar">
                                    {user.avatarUrl() ? (
                                        <img src={user.avatarUrl()} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                    ) : (
                                        <span className="transfer-user-avatar-placeholder" style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ccc', color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>{user.displayName().charAt(0).toUpperCase()}</span>
                                    )}
                                </span>
                                <span className="transfer-user-name">{user.displayName()}</span>
                                {isSelected ? <span className="transfer-check">✓</span> : null}
                            </div>
                        );
                    })}
                </div>
                <Button
                    className="Button Button--primary Button--block"
                    onclick={() => this.doTransfer()}
                    disabled={!this.transferTarget}
                    style={{ marginTop: 12 }}
                >
                    {app.translator.trans('xelson-chat.forum.chat.edit_modal.creator_leave.confirm_transfer')}
                </Button>
                <Button className="Button Button--flat Button--block" onclick={() => { this.leaveState = 'confirm'; this.transferTarget = null; m.redraw(); }}>
                    {app.translator.trans('xelson-chat.forum.chat.edit_modal.creator_leave.back')}
                </Button>
            </div>
        );
    }

    onleave() {
        if (!this.isLocalLeaved) {
            // Currently in the chat — leave action
            if (this.isCreator(app.session.user) && !app.chat.isChatPM(this.model) && !this.isOnlyActiveMember()) {
                // Creator of a channel/group with other members — show
                // transfer/disband options. If the creator is the *only* member,
                // skip the panel and just disband (handled in doLeave).
                this.leaveState = 'confirm';
                this.transferTarget = null;
                m.redraw();
            } else {
                // Normal member, or sole member (creator or not) — leave/disband
                this.doLeave();
            }
        } else {
            // Already left — return to chat
            this.doReturn();
        }
    }

    // True when the current user is the only *active* (not removed) member of
    // this chat. In that case leaving should disband the chat outright.
    isOnlyActiveMember() {
        const model = this.model;
        const me = app.session.user;
        const active = (model.users() || []).filter((u) => {
            if (!u) return false;
            const pivot = u.chat_pivot(model.id());
            return pivot && !pivot.removed_at();
        });
        return active.length === 1 && active[0].id() == me.id();
    }

    doLeave() {
        const model = this.model;
        const chatId = model.id();
        const me = app.session.user;

        // A private chat (PM) should dissolve when any participant leaves — we
        // never want to leave a one-person shell behind (user requirement).
        // For channels, only disband when the leaver is the sole remaining
        // member; otherwise just remove self via a PATCH.
        if (app.chat.isChatPM(model) || this.isOnlyActiveMember()) {
            this.requestDeleteChat(model, chatId);
            this.hide();
            return;
        }

        model
            .save({
                users: { removed: [Model.getIdentifier(me)] },
                relationships: { users: this.getSelectedUsers() },
            })
            .then(() => {
                this.leaveState = null;
                m.redraw();
            })
            .catch((err) => {
                // A stale/ghost chat (deleted elsewhere while Pusher is off)
                // returns 404 from the edit handler. Treat it as gone and drop
                // it from the local store instead of surfacing an uncaught error.
                if (err && err.status === 404) {
                    app.chat.deleteChat(model);
                    app.store.remove(model);
                    this.leaveState = null;
                } else {
                    console.error('[ChatLeave] failed:', err);
                }
                m.redraw();
            });

        this.hide();
    }

    doReturn() {
        this.getSelectedUsers().push(app.session.user);

        this.model
            .save({
                users: { added: [Model.getIdentifier(app.session.user)] },
                relationships: { users: this.getSelectedUsers() },
            })
            .then(() => {
                this.leaveState = null;
                m.redraw();
            })
            .catch((err) => {
                console.error('[ChatReturn] failed:', err);
                m.redraw();
            });

        this.hide();
    }

    // Sends a real HTTP DELETE to disband a chat. Tolerates 404 so a
    // stale/ghost client entry is dropped cleanly (DeleteChatHandler is
    // idempotent). Shared by the explicit delete button and auto-disband.
    requestDeleteChat(model, chatId) {
        const xhr = new XMLHttpRequest();
        xhr.open('DELETE', app.forum.attribute('apiUrl') + '/chats/' + chatId, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.setRequestHeader('X-CSRF-Token', app.session.csrfToken);
        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 404) {
                app.chat.deleteChat(model);
                app.store.remove(model);
            } else {
                console.error('[ChatDelete] failed:', xhr.status, xhr.responseText);
            }
            m.redraw();
        };
        xhr.onerror = function () { console.error('[ChatDelete] XHR error:', xhr.status); };
        xhr.send();
    }

    doTransfer() {
        if (!this.transferTarget) return;

        const targetId = Number(this.transferTarget.id());
        const selfId = app.session.user.id();

        // Transfer ownership: set target's role to 2 (creator), then remove self
        // The backend (EditChatHandler) handles both `edited` (role changes) and
        // `removed` (member removal) in a single save() call.
        this.model
            .save({
                users: {
                    edited: [{ id: targetId, role: 2 }],
                    removed: [Model.getIdentifier(app.session.user)],
                },
                relationships: { users: this.getSelectedUsers() },
            })
            .then(() => {
                this.leaveState = null;
                this.transferTarget = null;
                app.chat.deleteChat(this.model);
                app.store.remove(this.model);
                m.redraw();
            });

        this.hide();
    }

    doDisband() {
        // Reuse existing delete flow — confirm by typing channel name
        this.leaveState = null;
        this.deleteState = 0;
        // Open the delete confirmation inline
        this.deleteState = 1;
        m.redraw();
    }

    isCanEditChannel() {
        return this.getInput().title().length;
    }

    isCanEditChat() {
        if (this.alertText()) return false;

        return true;
    }

    componentDeleteChat() {
        return [
            this.deleteState == 1
                ? [
                      <br></br>,
                      this.componentFormInput({
                          title: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.delete.title'),
                          desc: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.delete.desc'),
                          placeholder: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.delete.placeholder'),
                          stream: this.deleteChatTitleInput,
                      }),
                  ]
                : null,
            <Button
                className="Button Button--primary Button--block ButtonDelete"
                onclick={this.ondelete.bind(this)}
                disabled={this.deleteState == 1 && !this.isValidTitleCopy()}
            >
                {app.translator.trans('xelson-chat.forum.chat.edit_modal.form.delete.button')}
            </Button>,
        ];
    }

    isValidTitleCopy() {
        return this.deleteChatTitleInput() == this.model.title();
    }

    ondelete() {
        switch (this.deleteState) {
            case 0: {
                this.deleteState = 1;
                break;
            }
            case 1: {
                if (this.isValidTitleCopy()) {
                    // Native DELETE (idempotent handler) — see requestDeleteChat.
                    this.requestDeleteChat(this.model, this.model.id());
                    this.hide();
                }
                break;
            }
        }
    }

    content() {
        const isPM = app.chat.isChatPM(this.model);
        const isChannel = !!this.model.type();

        // Build list of non-PM chats for the channel selector
        const allChats = (app.chat.getChats() || []).filter(c => c && !app.chat.isChatPM(c));

        return (
            <div className="Modal-body">
                <div class="Form-group InputTitle">
                    {/* Channel type badge */}
                    <div className="chat-type-badge">
                        <span className={'badge badge--' + (isPM ? 'pm' : (isChannel ? 'channel' : 'group'))}>
                            {isPM
                                ? app.translator.trans('xelson-chat.forum.chat.list.add_modal.chat')
                                : (isChannel
                                    ? app.translator.trans('xelson-chat.forum.chat.list.add_modal.channel')
                                    : app.translator.trans('xelson-chat.forum.chat.edit_modal.group_chat'))}
                        </span>
                        {this.model.id() ? <span className="chat-id">ID: {this.model.id()}</span> : null}
                    </div>

                    {/* Channel selector dropdown — lets admin pick which channel to edit */}
                    {!isPM && allChats.length > 1 ? (
                        <div className="channel-selector-wrap" style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
                                {app.translator.trans('xelson-chat.forum.chat.edit_modal.select_channel') || '切换管理的频道'}
                            </label>
                            <select
                                class="FormControl"
                                onchange={(e) => {
                                    const targetId = e.target.value;
                                    if (targetId && targetId !== String(this.model.id())) {
                                        const target = allChats.find(c => String(c.id()) === targetId);
                                        if (target) {
                                            // Close current and reopen with selected chat
                                            this.hide();
                                            // Use setTimeout to avoid modal conflicts
                                            setTimeout(() => {
                                                app.modal.show(ChatEditModal, { model: target });
                                            }, 300);
                                        }
                                    }
                                }}
                            >
                                {allChats.map(c => (
                                    <option value={String(c.id())} selected={c.id() === this.model.id()}>
                                        {(c.title() || '#' + c.id()) + (!!c.type() ? ' [频道]' : ' [群聊]')}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : null}

                    {this.componentForm()}

                    <div className="ButtonsPadding"></div>
                    {this.componentFormButtons()}
                </div>
            </div>
        );
    }
}
