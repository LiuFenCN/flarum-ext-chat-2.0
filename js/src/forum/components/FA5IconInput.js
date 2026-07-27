import Component from 'flarum/common/Component';
import Stream from 'flarum/common/utils/Stream';
import { fa5IconsList } from '../resources';
import highlight from 'flarum/common/helpers/highlight';

export default class FA5IconInput extends Component {
    oninit(vnode) {
        super.oninit(vnode);

        this.icon = Stream(this.attrs.defaultIcon ?? 'fas fa-cloud');
        this.dropdownState = {};
    }

    dropdownIconMatches(stream) {
        const inputIcon = stream();
        const dropdownState = this.dropdownState;

        if (inputIcon !== dropdownState.lastInput) {
            dropdownState.matches = fa5IconsList.filter((icon) => icon.includes(inputIcon));
            if (dropdownState.matches.length > 5) dropdownState.matches = dropdownState.matches.sort((a, b) => 0.5 - Math.random());

            dropdownState.lastInput = inputIcon;
        }

        return inputIcon.length &&
            dropdownState.matches.length > 0 &&
            !(dropdownState.matches.length == 1 && dropdownState.matches[0] === inputIcon) ? (
            <ul className="Dropdown-menu Dropdown--Icons Search-results">
                <li className="Dropdown-header">Font Awesome 5</li>
                {dropdownState.matches.slice(-5).map((icon) => (
                    <li
                        className="IconSearchResult"
                        onclick={(e) => {
                            this.attrs.stream(icon);
                        }}
                    >
                        <span className="Chat-FullColor">
                            <i className={icon}></i>
                        </span>
                        <span>{highlight(icon, inputIcon)}</span>
                    </li>
                ))}
            </ul>
        ) : null;
    }

    view() {
        const options = this.attrs;
        return [
            options.title ? <label>{options.title}</label> : null,
            <div className="IconSearch">
                {options.desc ? <label>{options.desc}</label> : null}
                <div className="Icon-Input IconSearchResult">
                    <input
                        class="FormControl"
                        type="text"
                        bidi={options.stream}
                        placeholder={options.placeholder}
                        onupdate={options.inputOnUpdate}
                        onfocus={() => (this.inputIconHasFocus = true)}
                        onclick={() => (this.inputIconHasFocus = true)}
                        onkeypress={(e) => (this.inputIconHasFocus = !(e.keyCode == 13))}
                    />
                    <span className="Chat-FullColor">
                        <i className={options.stream()} />
                    </span>
                    {this.inputIconHasFocus ? this.dropdownIconMatches(options.stream) : null}
                </div>
            </div>,
        ];
    }
}
