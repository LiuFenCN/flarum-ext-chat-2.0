import Component from 'flarum/common/Component';
import Stream from 'flarum/common/utils/Stream';

export default class ColorInput extends Component {
    view() {
        const options = this.attrs;
        return [
            options.title ? <label>{options.title}</label> : null,
            <div>
                {options.desc ? <label>{options.desc}</label> : null}
                <div className="Color-Input">
                    <input
                        class="FormControl"
                        type="color"
                        bidi={options.stream}
                        placeholder={options.placeholder}
                        onupdate={options.inputOnUpdate}
                        color={options.stream()}
                    />
                    <span className="Chat-FullColor" style={{ backgroundColor: options.stream() || '#000' }} />
                </div>
            </div>,
        ];
    }
}
