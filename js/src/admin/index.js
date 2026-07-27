import { extend } from 'flarum/extend';
import app from 'flarum/app';
import ExtensionPage from 'flarum/admin/components/ExtensionPage';

/* global flarum */

app.initializers.add('acolasialiuliu/flarum-ext-chat', () => {
  extend(ExtensionPage.prototype, 'settingsItems', function (items) {
    if (this.extension.id !== 'acolasialiuliu-flarum-ext-chat') return;

    const settings = {};
    const prefix = 'xelson-chat.settings.';
    ['charlimit', 'display.minimize', 'display.censor'].forEach(function (k) {
      var full = prefix + k;
      settings[full] = app.data.settings[full];
    });

    items.add(
      'chat-charlimit',
      <div className="Form-group">
        <label>{app.translator.trans(prefix + 'charlimit')}</label>
        <input
          className="FormControl"
          type="number"
          min="0"
          bidi={this.setting(prefix + 'charlimit', settings[prefix + 'charlimit'])}
        />
      </div>,
      10
    );

    items.add(
      'chat-minimize',
      <div className="Form-group">
        <label>{app.translator.trans(prefix + 'display.minimize')}</label>
        <div className="helpText">
          {app.translator.trans('xelson-chat.admin.settings.display.title')}
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            bidi={this.setting(prefix + 'display.minimize', settings[prefix + 'display.minimize'])}
          />
          {app.translator.trans('core.admin.settings.on_label')}
        </label>
      </div>,
      20
    );

    items.add(
      'chat-censor',
      <div className="Form-group">
        <label>{app.translator.trans(prefix + 'display.censor')}</label>
        <div className="helpText">
          {app.translator.trans('xelson-chat.admin.settings.display.title')}
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            bidi={this.setting(prefix + 'display.censor', settings[prefix + 'display.censor'])}
          />
          {app.translator.trans('core.admin.settings.on_label')}
        </label>
      </div>,
      30
    );
  });
});
