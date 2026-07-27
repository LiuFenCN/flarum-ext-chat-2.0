import { avatar } from '../utils/compat';
import username from 'flarum/common/helpers/username';
import highlight from 'flarum/common/helpers/highlight';

import LoadingIndicator from 'flarum/common/components/LoadingIndicator';

/**
 * Legacy class — kept for backward compatibility.
 * ChatSearchUser now has its own inline user loading logic.
 * This class is retained in case other components reference it directly.
 */
export default class UsersSearchResults {
    constructor(props) {
        this.results = {};
        this.searching = false;
        this.initialUsersLoaded = false;
        this.initialLoading = true;

        if (!props.state.usersSelected) props.state.usersSelected = [];
        this.usersSelected = props.state.usersSelected;

        this.loadInitialUsers();
    }

    loadInitialUsers() {
        if (this.initialUsersLoaded) return;
        this.initialUsersLoaded = true;

        // Use app.store.find for Flarum 2.0 compatibility
        const apiUrl = (app.forum && app.forum.attribute ? app.forum.attribute('apiUrl') : '') || '/api';
        
        app.request({
            method: 'GET',
            url: apiUrl + '/users',
            params: {
                'page[limit]': '20',
                'sort': '-last_seen_at',
            },
        })
            .then((result) => {
                const users = (result && result.data) || [];
                users.forEach((u) => {
                    try { if (app.store && app.store.pushObject) app.store.pushObject({ type: 'users', id: String(u.id), ...u }); } catch(e) {}
                });
                this.results['__initial__'] = users
                    .map((u) => app.store ? app.store.getById('users', u.id) : u)
                    .filter(Boolean);
                this.initialLoading = false;
                m.redraw();
            })
            .catch(() => {
                this.results['__initial__'] = (app.store && app.store.all ? app.store.all('users') : []);
                this.initialLoading = false;
                m.redraw();
            });
    }

    search(query) {
        this.searching = true;
        const apiUrl = (app.forum && app.forum.attribute ? app.forum.attribute('apiUrl') : '') || '/api';

        return app.request({
            method: 'GET',
            url: apiUrl + '/users',
            params: {
                'filter[q]': query,
                'page[limit]': '5',
            },
        })
            .then((result) => {
                const users = (result && result.data) || [];
                this.results[query] = users
                    .map((u) => app.store ? app.store.getById('users', u.id) : u)
                    .filter(Boolean);
                this.searching = false;
                m.redraw();
            })
            .catch(() => {
                this.results[query] = [];
                this.searching = false;
                m.redraw();
            });
    }

    isUserSelected(user) {
        return this.usersSelected.some((u) => user.id() == u.id());
    }

    userClick(user) {
        if (!this.isUserSelected(user)) this.usersSelected.push(user);
        else this.usersSelected.splice(this.usersSelected.indexOf(user), 1);
    }

    view(query) {
        query = (query || '').toLowerCase();

        if (this.initialLoading && !query) {
            return (
                <li className="SearchFailed" style={{ textAlign: 'center', padding: '20px' }}>
                    <LoadingIndicator size="small" />
                    <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>正在加载用户...</div>
                </li>
            );
        }

        const apiResults = (query && this.results[query]) || [];
        const initialResults = (!query && this.results['__initial__']) || [];
        const storeUsers = (app.store && app.store.all ? app.store.all('users') : []).filter((user) =>
            [user.username(), user.displayName()].some((value) => (value || '').toLowerCase().includes(query))
        );

        const usersList = apiResults
            .concat(initialResults)
            .concat(storeUsers)
            .filter((user) => user !== app.session.user);

        let resultsFind = usersList
            .filter((e, i, arr) => arr.lastIndexOf(e) === i)
            .sort((a, b) => (a.displayName() || '').localeCompare(b.displayName() || ''))
            .filter((user) => !this.isUserSelected(user));

        let moreText;
        if (resultsFind.length > 5) {
            moreText = (
                <div class="MoreResultsText">
                    {app.translator.trans('xelson-chat.forum.chat.list.add_modal.search.more_results', { more_results: resultsFind.length - 5 })}
                </div>
            );
            resultsFind = resultsFind.slice(-5);
        }

        if (!resultsFind.length) {
            if (!this.searching)
                return <li className="SearchFailed">{app.translator.trans('xelson-chat.forum.chat.list.add_modal.search.failed')}</li>;
            else LoadingIndicator.component({ size: 'tiny', className: 'Button Button--icon Button--link' });
        }

        const resultsSelected = Object.values(this.usersSelected).slice(-5);

        return [
            <li className="Dropdown-header">{app.translator.trans('core.forum.search.users_heading')}</li>,
            resultsFind.map((user) => {
                const name = username(user);
                const id = user.id();
                const children = [highlight(name.text, query)];

                return (
                    <li className="UserSearchResult UserSearchResult" data-index={'users' + id} onclick={this.userClick.bind(this, user)}>
                        <span>
                            {avatar(user)}
                            {{ ...name, text: undefined, children }}
                        </span>
                    </li>
                );
            }),
            moreText,
            resultsSelected.length ? (
                <li className="Dropdown-header">{app.translator.trans('xelson-chat.forum.chat.list.add_modal.search.invited')}</li>
            ) : null,
            resultsSelected.map((user) => {
                const name = username(user);
                const children = [highlight(name.text, query)];

                return (
                    <li className="UserSearchResult UserSearchResult" data-index={'users' + user.id()} onclick={this.userClick.bind(this, user)}>
                        <span class="selected">
                            {avatar(user)}
                            {{ ...name, text: undefined, children }}
                        </span>
                    </li>
                );
            }),
        ];
    }
}
