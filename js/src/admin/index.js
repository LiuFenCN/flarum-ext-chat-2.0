import { extend } from 'flarum/extend';
import app from 'flarum/app';
import ExtensionPage from 'flarum/admin/components/ExtensionPage';

/* global flarum */

const PREFIX = 'xelson-chat.settings.';
const EXT_ID = 'xelson-chat';

app.initializers.add('acolasialiuliu/flarum-ext-chat', () => {
  extend(ExtensionPage.prototype, 'settingsItems', function (items) {
    if (this.extension.id !== EXT_ID) return;

    // --- 消息字数限制 ---
    items.add(
      'chat-charlimit',
      <div className="Form-group">
        <label>{app.translator.trans(PREFIX + 'charlimit')}</label>
        <input
          className="FormControl"
          type="number"
          min="0"
          bidi={this.setting(PREFIX + 'charlimit', app.data.settings[PREFIX + 'charlimit'])}
        />
      </div>,
      10
    );

    // --- 默认最小化 ---
    items.add(
      'chat-minimize',
      <div className="Form-group">
        <label>{app.translator.trans(PREFIX + 'display.minimize')}</label>
        <label className="checkbox">
          <input
            type="checkbox"
            bidi={this.setting(PREFIX + 'display.minimize', app.data.settings[PREFIX + 'display.minimize'])}
          />
          {app.translator.trans('core.admin.settings.on_label')}
        </label>
      </div>,
      20
    );

    // --- 屏蔽游客 ---
    items.add(
      'chat-censor',
      <div className="Form-group">
        <label>{app.translator.trans(PREFIX + 'display.censor')}</label>
        <label className="checkbox">
          <input
            type="checkbox"
            bidi={this.setting(PREFIX + 'display.censor', app.data.settings[PREFIX + 'display.censor'])}
          />
          {app.translator.trans('core.admin.settings.on_label')}
        </label>
      </div>,
      30
    );

    // --- 禁止游客使用聊天室 ---
    items.add(
      'chat-block-guests',
      <div className="Form-group">
        <label>{app.translator.trans(PREFIX + 'block_guests')}</label>
        <div className="helpText">
          {app.translator.trans(PREFIX + 'block_guests_help')}
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            bidi={this.setting(PREFIX + 'block_guests', app.data.settings[PREFIX + 'block_guests'])}
          />
          {app.translator.trans('core.admin.settings.on_label')}
        </label>
      </div>,
      40
    );

    // --- 频道消息保留时间 ---
    items.add(
      'chat-channel-retention',
      <div className="Form-group">
        <label>{app.translator.trans(PREFIX + 'channel_retention')}</label>
        <div className="helpText">
          {app.translator.trans(PREFIX + 'channel_retention_help')}
        </div>
        <input
          className="FormControl"
          type="number"
          min="0"
          bidi={this.setting(PREFIX + 'channel_retention', app.data.settings[PREFIX + 'channel_retention'])}
        />
        <span className="helpText">{app.translator.trans(PREFIX + 'retention_unit')}</span>
      </div>,
      50
    );

    // --- 私聊消息保留时间 ---
    items.add(
      'chat-pm-retention',
      <div className="Form-group">
        <label>{app.translator.trans(PREFIX + 'pm_retention')}</label>
        <div className="helpText">
          {app.translator.trans(PREFIX + 'pm_retention_help')}
        </div>
        <input
          className="FormControl"
          type="number"
          min="0"
          bidi={this.setting(PREFIX + 'pm_retention', app.data.settings[PREFIX + 'pm_retention'])}
        />
        <span className="helpText">{app.translator.trans(PREFIX + 'retention_unit')}</span>
      </div>,
      60
    );

    // --- 未读邮件提醒天数 ---
    items.add(
      'chat-email-reminder',
      <div className="Form-group">
        <label>{app.translator.trans(PREFIX + 'email_reminder_days')}</label>
        <div className="helpText">
          {app.translator.trans(PREFIX + 'email_reminder_days_help')}
        </div>
        <input
          className="FormControl"
          type="number"
          min="0"
          bidi={this.setting(PREFIX + 'email_reminder_days', app.data.settings[PREFIX + 'email_reminder_days'])}
        />
        <span className="helpText">{app.translator.trans(PREFIX + 'retention_unit')}</span>
      </div>,
      70
    );
  });
});
