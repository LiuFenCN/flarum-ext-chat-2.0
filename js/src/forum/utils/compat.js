import m from 'mithril';
import Avatar from 'flarum/common/components/Avatar';
import Icon from 'flarum/common/components/Icon';

/**
 * Wrapper: flarum 1.x avatar() helper → 2.0 Avatar component
 * Usage: avatar(user, attrs) returns a mithril vnode.
 */
export function avatar(user, attrs = {}) {
  return m(Avatar, { ...attrs, user });
}

/**
 * Wrapper: flarum 1.x icon() helper → 2.0 Icon component
 * Usage: icon(name) returns a mithril vnode.
 */
export function icon(name) {
  return m(Icon, { name });
}
