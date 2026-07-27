import Modal from 'flarum/common/components/Modal';
import ChatSearchUser from './ChatSearchUser';
import Stream from 'flarum/common/utils/Stream';
import classList from 'flarum/common/utils/classList';
import { fa5IconsList } from '../resources';
import highlight from 'flarum/common/helpers/highlight';

export default class ChatModal extends Modal {
    oninit(vnode) {
        super.oninit(vnode);

        this.model = this.attrs.model;

        app.search.neonchat = { usersSelected: [] };
        this.usersSelected = app.search.neonchat.usersSelected;

        app.chat.saveFrameState('beingShown', false);

        this.input = {
            title: Stream(''),
            color: Stream(''),
            icon: Stream(''),
            iconState: {
                matches: [],
                lastInput: null,
            },
        };
    }

    hide() {
        super.hide();
        app.chat.saveFrameState('beingShown', true);
    }

    onremove(vnode) {
        super.onremove(vnode);
        app.search.neonchat = null;
    }

    getInput() {
        return this.input;
    }

    setSelectedUsers(users) {
        app.search.neonchat.usersSelected = users;
        this.usersSelected = app.search.neonchat.usersSelected;
    }

    getSelectedUsers() {
        return this.usersSelected;
    }

    className() {
        return 'ChatModal Modal--small';
    }

    isChatExists() {
        return this.getSelectedUsers().length === 1 && app.chat.isExistsPMChat(app.session.user, this.getSelectedUsers()[0]);
    }

    alertText() {
        if (this.isChatExists()) return app.translator.trans('xelson-chat.forum.chat.list.add_modal.alerts.exists');

        return null;
    }

    componentAlert() {
        return !this.alertText() ? null : <div className="Alert">{this.alertText()}</div>;
    }

    componentFormUsersSelect(label = 'xelson-chat.forum.chat.list.add_modal.form.users') {
        return [<label>{app.translator.trans(label)}</label>, this.componentUsersSelect()];
    }

    userMentionContent(user) {
        return '@' + user.displayName();
    }

    userMentionClassname(user) {
        return 'deletable';
    }

    userMentionOnClick(event, user) {
        return this.getSelectedUsers().splice(this.getSelectedUsers().indexOf(user), 1);
    }

    componentUsersMentions() {
        return (
            <div className="UsersTags">
                {this.getSelectedUsers().map((u) => (
                    <div className={classList(['UserMention', this.userMentionClassname(u)])} onclick={this.userMentionOnClick.bind(this, u)}>
                        {this.userMentionContent(u)}
                    </div>
                ))}
            </div>
        );
    }

    componentUsersSelect() {
        return [
            this.componentAlert(),
            this.componentUsersMentions(),
            <div className="UsersSearch" style={{ boxSizing: 'border-box', overflow: 'hidden', maxWidth: '100%', width: '100%' }}>
                <ChatSearchUser state={app.search} />
            </div>,
        ];
    }

    componentFormIcon(options) {
        // Preset icons commonly used for chat channels
        const presetIcons = [
            'fas fa-comments', 'fas fa-hashtag', 'fas fa-bolt', 'fas fa-star',
            'fas fa-heart', 'fas fa-gamepad', 'fas fa-music', 'fas fa-film',
            'fas fa-camera', 'fas fa-image', 'fas fa-code', 'fas fa-book',
            'fas fa-newspaper', 'fas fa-globe', 'fas fa-cloud', 'fas fa-rocket',
            'fas fa-flag', 'fas fa-bell', 'fas fa-envelope', 'fas fa-users',
            'fas fa-user-shield', 'fas fa-crown', 'fas fa-fire', 'fas fa-gem',
            'fas fa-magic', 'fas fa-palette', 'fas fa-toolbox', 'fas fa-lightbulb',
        ];

        return [
            options.title ? <label>{options.title}</label> : null,
            options.desc ? <label className="help-text">{options.desc}</label> : null,
            <div className="IconSearch">
                <div className="Icon-Input IconSearchResult">
                    <input
                        class="FormControl"
                        type="text"
                        bidi={options.stream}
                        placeholder={options.placeholder}
                        onupdate={this.formInputOnUpdate.bind(this)}
                        onfocus={() => (this.inputIconHasFocus = true)}
                        onclick={() => (this.inputIconHasFocus = true)}
                        onkeypress={(e) => (this.inputIconHasFocus = !(e.keyCode == 13))}
                    />
                    <span className="Chat-FullColor icon-preview">
                        <i className={this.input.icon()?.length ? this.input.icon() : 'fas fa-bolt'} />
                    </span>
                    {this.inputIconHasFocus ? this.dropdownIconMatches(this.input.icon()) : null}
                </div>
                {/* Preset icon grid */}
                <div
                    className="icon-palette"
                    style={{
                        display: 'flex', flexWrap: 'wrap', gap: '5px',
                        marginTop: '8px', padding: '8px',
                        background: 'rgba(0,0,0,0.03)', borderRadius: '8px'
                    }}
                >
                    {presetIcons.map((icon) => (
                        <span
                            className={'icon-swatch' + (this.input.icon() === icon ? ' active' : '')}
                            onclick={() => options.stream(icon)}
                            data-title={icon}
                            style={{
                                width: 34, height: 34,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', borderRadius: 6,
                                border: '2px solid transparent',
                                color: 'var(--glass-text-muted)', fontSize: 16,
                                flexShrink: 0
                            }}
                        >
                            <i className={icon}></i>
                        </span>
                    ))}
                </div>
            </div>,
        ];
    }

    componentFormColor(options) {
        // Preset color palette for chat channels
        const presetColors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F1948A', '#82E0AA', '#F8C471', '#AED6F1', '#D7BDE2',
            '#A3E4D7', '#FAD7A0', '#A9CCE3', '#D5F5E3', '#FADBD8',
            '#1ABC9C', '#3498DB', '#9B59B6', '#E74C3C', '#F39C12',
            '#2ECC71', '#E67E22', '#1F618D', '#148F77', '#6C3483',
        ];

        return [
            options.title ? <label>{options.title}</label> : null,
            options.desc ? <label className="help-text">{options.desc}</label> : null,
            <div className="Color-Input" style={{ position: 'relative' }}>
                <div className="color-input-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        class="FormControl"
                        type="text"
                        bidi={options.stream}
                        placeholder={options.placeholder}
                        onupdate={this.formInputOnUpdate.bind(this)}
                    />
                    <span
                        className="Chat-FullColor color-preview"
                        style={{
                            backgroundColor: this.input.color() || '#cccccc',
                            height: 28, width: 28, borderRadius: 6,
                            border: '2px solid rgba(255,255,255,0.3)',
                            flexShrink: 0, display: 'inline-block'
                        }}
                    />
                </div>
                {/* Preset color swatch grid — inline styles ensure visibility */}
                <div
                    className="color-palette"
                    style={{
                        display: 'flex', flexWrap: 'wrap', gap: '5px',
                        marginTop: '8px', padding: '8px',
                        background: 'rgba(0,0,0,0.03)', borderRadius: '8px'
                    }}
                >
                    {presetColors.map((c) => (
                        <span
                            className={'color-swatch' + (this.input.color() === c ? ' active' : '')}
                            style={{
                                backgroundColor: c,
                                width: 26, height: 26, borderRadius: '50%',
                                cursor: 'pointer', border: '2px solid transparent',
                                display: 'inline-block', flexShrink: 0
                            }}
                            onclick={() => options.stream(c)}
                            data-title={c}
                        />
                    ))}
                </div>
            </div>,
        ];
    }

    dropdownIconMatches(search) {
        let inputIcon = this.input.icon();
        let iconState = this.input.iconState;

        if (inputIcon !== iconState.lastInput) {
            iconState.matches = fa5IconsList.filter((icon) => icon.includes(inputIcon));
            if (iconState.matches.length > 5) iconState.matches = iconState.matches.sort((a, b) => 0.5 - Math.random());

            iconState.lastInput = inputIcon;
        }

        return inputIcon.length && iconState.matches.length > 0 && !(iconState.matches.length == 1 && iconState.matches[0] === inputIcon) ? (
            <ul className="Dropdown-menu Dropdown--Icons Search-results">
                <li className="Dropdown-header">Font Awesome 5</li>
                {iconState.matches.slice(-5).map((icon) => (
                    <li className="IconSearchResult" onclick={(e) => this.input.icon(icon)}>
                        <span className="Chat-FullColor">
                            <i className={icon}></i>
                        </span>
                        <span>{highlight(icon, inputIcon)}</span>
                    </li>
                ))}
            </ul>
        ) : null;
    }

    formInputOnUpdate(vnode) {
        $('.Chat-FullColor').css({ color: this.input.color(), backgroundColor: this.input.color() });
    }

    componentFormInput(options) {
        return [
            options.title ? <label>{options.title}</label> : null,
            <div>
                {options.desc ? <label>{options.desc}</label> : null}
                <input class="FormControl" type="text" bidi={options.stream} placeholder={options.placeholder} />
            </div>,
        ];
    }
}
