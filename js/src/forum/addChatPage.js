import { extend } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';
import LinkButton from 'flarum/common/components/LinkButton';
import ChatPage from './components/ChatPage';

export default function addChatPage() {
    app.routes.chat = { path: '/chat', component: ChatPage };

    extend(IndexPage.prototype, 'navItems', function (items) {
        if (app.screen() !== 'phone') return;

        // Hide chat link from guests when block_guests is enabled.
        // Flarum 2.0: isGuest() only exists on the Guest model, not on the
        // logged-in User model — use id() === null instead.
        var blockGuests = app.forum && app.forum.attribute('xelson-chat.settings.block_guests');
        var isGuest = !app.session.user || app.session.user.id() === null;
        if (blockGuests && blockGuests !== '0' && isGuest) return;

        items.add(
            'chat',
            <LinkButton icon="fas fa-comment" href={app.route('chat')}>
                {app.translator.trans('xelson-chat.forum.index.chat_link')}
            </LinkButton>,
            -10
        );
    });
}
