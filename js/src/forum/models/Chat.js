import Model from 'flarum/common/Model';
import computed from 'flarum/common/utils/computed';

export default class Chat extends Model {}

Object.assign(Chat.prototype, {
    _title: Model.attribute('title'),
    _color: Model.attribute('color'),
    type: Model.attribute('type'),
    created_at: Model.attribute('created_at', Model.transformDate),
    creator: Model.hasOne('creator'),
    users: Model.hasMany('users'),
    first_message: Model.hasOne('first_message'),
    last_message: Model.hasOne('last_message'),
    icon: Model.attribute('icon'),

    role: Model.attribute('role'),
    unreaded: Model.attribute('unreaded', (v) => Math.max(v, 0)),
    readed_at: Model.attribute('readed_at', Model.transformDate),
    removed_at: Model.attribute('removed_at', Model.transformDate),
    joined_at: Model.attribute('joined_at', Model.transformDate),
    removed_by: Model.attribute('removed_by'),

    pm_user: computed('freshness', function (updated) {
        return this.getPMUser();
    }),

    title: computed('pm_user', '_title', function (pm_user, _title) {
        if (pm_user) {
            var name = pm_user.displayName();
            // If the display name looks like a raw ID (all digits / phone number),
            // show it as a formatted private-chat label so it doesn't look broken.
            if (/^[\d\s\-+]{10,}$/.test(name)) {
                return app.translator.trans('xelson-chat.forum.chat.pm_title', { name: name });
            }
            return name;
        }
        return _title;
    }),

    color: computed('pm_user', '_color', function (pm_user, _color) {
        // PM chats derive their color from the other user, who may not have
        // a `color` attribute set — fall back to a neutral color so the
        // avatar is still rendered and `textColor()` never receives undefined.
        if (pm_user) return pm_user.color() || '#4a76a8';
        return _color || '#4a76a8';
    }),

    avatarUrl: computed('pm_user', function (pm_user) {
        return pm_user ? pm_user.avatarUrl() : null;
    }),

    textColor: computed('color', function (color) {
        // Guard against undefined/null so we never call .charAt() on undefined.
        if (color == null || typeof color !== 'string') return '#FFF';
        return this.pickTextColorBasedOnBgColorSimple(color, '#FFF', '#000');
    }),

    matches(q) {
        return (
            this.title().toLowerCase().includes(q) ||
            this.users().some((user) => {
                return user.displayName().toLowerCase().includes(q);
            })
        );
    },

    getPMUser() {
        let users = this.users();
        if (app.session.user && this.type() == 0 && users.length && users.length < 3) {
            for (const user of users) {
                if (user && user != app.session.user) return user;
            }
        }
        return null;
    },

    pickTextColorBasedOnBgColorSimple(bgColor, lightColor, darkColor) {
        if (bgColor == null || typeof bgColor !== 'string') return darkColor;
        var color = bgColor.charAt(0) === '#' ? bgColor.substring(1, 7) : bgColor;
        if (color.length < 6) return darkColor;
        var r = parseInt(color.substring(0, 2), 16);
        var g = parseInt(color.substring(2, 4), 16);
        var b = parseInt(color.substring(4, 6), 16);
        return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? darkColor : lightColor;
    },
});
