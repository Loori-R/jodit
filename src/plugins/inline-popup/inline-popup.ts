import './inline-popup.less';

import autobind from 'autobind-decorator';

import { Plugin } from '../../core/plugin';
import {
	Buttons,
	IBound,
	IControlType,
	IDictionary,
	IJodit,
	IPopup,
	IToolbarCollection,
	IUIButtonState, Nullable
} from '../../types';
import { makeCollection } from '../../modules/toolbar/factory';
import { Popup } from '../../core/ui/popup';
import { Config } from '../../config';
import {
	clearCenterAlign,
	css,
	splitArray,
	isString,
	attr,
	position
} from '../../core/helpers';
import { Dom, Table, ToolbarCollection } from '../../modules';
import { ColorPickerWidget, TabsWidget } from '../../modules/widget';
import { debounce } from '../../core/decorators';

declare module '../../config' {
	interface Config {
		popup: IDictionary<Array<IControlType | string>>;
		toolbarInline: boolean;
		toolbarInlineButtonSize: IUIButtonState['size'];
		toolbarInlineDisableFor: string | string[];
	}
}

Config.prototype.toolbarInlineButtonSize = 'small';
Config.prototype.toolbarInline = true;
Config.prototype.toolbarInlineDisableFor = [];

Config.prototype.popup = {
	a: [
		{
			name: 'eye',
			tooltip: 'Open link',
			exec: (editor: IJodit, current: Node) => {
				const href = attr(current as HTMLElement, 'href');

				if (current && href) {
					editor.ow.open(href);
				}
			}
		} as IControlType,
		{
			name: 'link',
			tooltip: 'Edit link',
			icon: 'pencil'
		},
		'unlink',
		'brush',
		'file'
	],
	jodit: [
		{
			name: 'bin',
			tooltip: 'Delete',
			exec: (editor: IJodit, image: Node) => {
				editor.selection.removeNode(image);
			}
		}
	],
	'jodit-media': [
		{
			name: 'bin',
			tooltip: 'Delete',
			exec: (editor: IJodit, image: Node) => {
				editor.selection.removeNode(image);
			}
		}
	],
	img: [
		{
			name: 'delete',
			icon: 'bin',
			tooltip: 'Delete',
			exec: (editor: IJodit, image: Node) => {
				editor.selection.removeNode(image);
			}
		},
		{
			name: 'pencil',
			exec(editor: IJodit, current: Node) {
				const tagName: string = (current as HTMLElement).tagName.toLowerCase();
				if (tagName === 'img') {
					editor.e.fire('openImageProperties', current);
				}
			},
			tooltip: 'Edit'
		},
		{
			name: 'valign',
			list: ['Top', 'Middle', 'Bottom'],
			tooltip: 'Vertical align',
			exec: (
				editor: IJodit,
				image: HTMLImageElement,
				control: IControlType
			) => {
				const tagName = (image as HTMLElement).tagName.toLowerCase();
				if (tagName !== 'img') {
					return;
				}

				const command =
					control.args && isString(control.args[1])
						? control.args[1].toLowerCase()
						: '';

				css(image, 'vertical-align', command);

				editor.e.fire('recalcPositionPopup');
			}
		},
		{
			name: 'left',
			list: ['Left', 'Right', 'Center', 'Normal'],
			exec: (
				editor: IJodit,
				image: HTMLImageElement,
				control: IControlType
			) => {
				const tagName: string = (image as HTMLElement).tagName.toLowerCase();
				if (tagName !== 'img') {
					return;
				}

				const command: string =
					control.args && typeof control.args[1] === 'string'
						? control.args[1].toLowerCase()
						: '';

				if (command !== 'normal') {
					if (['right', 'left'].indexOf(command) !== -1) {
						css(image, 'float', command);
						clearCenterAlign(image);
					} else {
						css(image, 'float', '');
						css(image, {
							display: 'block',
							'margin-left': 'auto',
							'margin-right': 'auto'
						});
					}
				} else {
					if (
						css(image, 'float') &&
						['right', 'left'].indexOf(
							(css(image, 'float') as string).toLowerCase()
						) !== -1
					) {
						css(image, 'float', '');
					}

					clearCenterAlign(image);
				}

				editor.e.fire('recalcPositionPopup');
			},
			tooltip: 'Horizontal align'
		}
	],
	table: [
		{
			name: 'brush',
			popup: (editor: IJodit, elm: HTMLTableElement) => {
				const selected: HTMLTableCellElement[] = Table.getAllSelectedCells(
					elm
				);

				let $bg: HTMLElement,
					$cl: HTMLElement,
					$br: HTMLElement,
					$tab: HTMLElement,
					color: string,
					br_color: string,
					bg_color: string;

				if (!selected.length) {
					return false;
				}

				color = css(selected[0], 'color') as string;
				bg_color = css(selected[0], 'background-color') as string;
				br_color = css(selected[0], 'border-color') as string;

				$bg = ColorPickerWidget(
					editor,
					(value: string) => {
						selected.forEach((cell: HTMLTableCellElement) => {
							css(cell, 'background-color', value);
						});
						editor.setEditorValue();
						// close();
					},
					bg_color
				);

				$cl = ColorPickerWidget(
					editor,
					(value: string) => {
						selected.forEach((cell: HTMLTableCellElement) => {
							css(cell, 'color', value);
						});
						editor.setEditorValue();
						// close();
					},
					color
				);

				$br = ColorPickerWidget(
					editor,
					(value: string) => {
						selected.forEach((cell: HTMLTableCellElement) => {
							css(cell, 'border-color', value);
						});
						editor.setEditorValue();
						// close();
					},
					br_color
				);

				$tab = TabsWidget(editor, [
					{ name: 'Background', content: $bg },
					{ name: 'Text', content: $cl },
					{ name: 'Border', content: $br }
				]);

				return $tab;
			},
			tooltip: 'Background'
		},
		{
			name: 'valign',
			list: ['Top', 'Middle', 'Bottom'],
			exec: (
				editor: IJodit,
				table: HTMLTableElement,
				control: IControlType
			) => {
				const command: string =
					control.args && typeof control.args[1] === 'string'
						? control.args[1].toLowerCase()
						: '';

				Table.getAllSelectedCells(table).forEach(
					(cell: HTMLTableCellElement) => {
						css(cell, 'vertical-align', command);
					}
				);
			},
			tooltip: 'Vertical align'
		},
		{
			name: 'splitv',
			list: {
				tablesplitv: 'Split vertical',
				tablesplitg: 'Split horizontal'
			},
			tooltip: 'Split'
		},
		{
			name: 'align',
			icon: 'left'
		},
		'\n',
		{
			name: 'merge',
			command: 'tablemerge',
			tooltip: 'Merge'
		},
		{
			name: 'addcolumn',
			list: {
				tableaddcolumnbefore: 'Insert column before',
				tableaddcolumnafter: 'Insert column after'
			},
			exec: (
				editor: IJodit,
				table: HTMLTableElement,
				control: IControlType
			) => {
				const command: string =
					control.args && typeof control.args[0] === 'string'
						? control.args[0].toLowerCase()
						: '';

				editor.execCommand(command, false, table);
			},
			tooltip: 'Add column'
		},
		{
			name: 'addrow',
			list: {
				tableaddrowbefore: 'Insert row above',
				tableaddrowafter: 'Insert row below'
			},
			exec: (
				editor: IJodit,
				table: HTMLTableElement,
				control: IControlType
			) => {
				const command: string =
					control.args && typeof control.args[0] === 'string'
						? control.args[0].toLowerCase()
						: '';

				editor.execCommand(command, false, table);
			},
			tooltip: 'Add row'
		},
		{
			name: 'delete',
			icon: 'bin',
			list: {
				tablebin: 'Delete table',
				tablebinrow: 'Delete row',
				tablebincolumn: 'Delete column',
				tableempty: 'Empty cell'
			},
			exec: (
				editor: IJodit,
				table: HTMLTableElement,
				control: IControlType
			) => {
				const command: string =
					control.args && typeof control.args[0] === 'string'
						? control.args[0].toLowerCase()
						: '';

				editor.execCommand(command, false, table);
				editor.e.fire('hidePopup');
			},
			tooltip: 'Delete'
		}
	],
	selection: [
		'bold',
		'underline',
		'italic',
		'ul',
		'ol',
		'\n',
		'outdent',
		'indent',
		'fontsize',
		'brush',
		'cut',
		'\n',
		'paragraph',
		'link',
		'align',
		'dots'
	]
} as IDictionary<Array<IControlType | string>>;

export class inlinePopup extends Plugin {
	private type: Nullable<string> = null;

	private popup: IPopup = new Popup(this.jodit);
	private toolbar: IToolbarCollection = makeCollection(
		this.jodit,
		this.popup
	);

	private isTargetClick: boolean = true;

	@autobind
	private onClick(e: MouseEvent): void {
		const node = e.target as Node,
			elements: string = Object.keys(this.j.o.popup).join('|'),
			target: HTMLElement | false = Dom.isTag(node, 'img')
				? node
				: Dom.closest(node, elements, this.j.editor);

		if (target && this.canShowPopupForType(target.nodeName.toLowerCase())) {
			this.isTargetClick = true;
			this.showPopupWithToolbar(
				() => position(target),
				target.nodeName.toLowerCase(),
				target
			);
		} else {
			this.isTargetClick = false;
		}
	}

	@debounce(500)
	private onSelectionChange(): void {
		const sel = this.j.selection.sel,
			range = this.j.selection.range;

		const node = this.j.selection.current();

		if (!node) {
			return;
		}

		if (sel?.isCollapsed || this.canShowPopupForType(node.nodeName)) {
			if (!this.isTargetClick && this.popup.isOpened) {
				this.popup.close();
			}

			return;
		}

		this.showPopupWithToolbar(
			() => range.getBoundingClientRect(),
			'selection'
		);
	}

	/**
	 * Show inline popup with some toolbar
	 *
	 * @param rect
	 * @param type - selection, img, a etc.
	 * @param elm
	 */
	@autobind
	private showPopupWithToolbar(
		rect: () => IBound,
		type: string,
		elm?: HTMLElement
	): boolean {
		type = type.toLowerCase();

		if (!this.canShowPopupForType(type)) {
			return false;
		}

		if (this.type !== type) {
			const data = this.j.o.popup[type];

			this.toolbar.buttonSize = this.j.o.toolbarInlineButtonSize;
			this.toolbar.build(data, elm);
			this.popup.setContent(this.toolbar.container);

			this.type = type;
		}

		this.popup.open(rect);

		return true;
	}

	/**
	 * Can show popup for this type
	 * @param type
	 */
	private canShowPopupForType(type: string): boolean {
		const data = this.j.o.popup[type.toLowerCase()];

		if (!this.j.o.toolbarInline || !data) {
			return false;
		}

		if (this.isExcludedTarget(type)) {
			return false;
		}

		return true;
	}

	/**
	 * For some elements do not show popup
	 * @param type
	 */
	private isExcludedTarget(type: string): boolean {
		return splitArray(this.j.o.toolbarInlineDisableFor)
			.map(a => a.toLowerCase())
			.includes(type.toLowerCase());
	}

	protected afterInit(jodit: IJodit): void {
		this.j.e
			.on(
				'getDiffButtons.mobile',
				(toolbar: ToolbarCollection): void | Buttons => {
					if (this.toolbar === toolbar) {
						return splitArray(jodit.o.buttons).filter(item => {
							const name = isString(item) ? item : item.name;

							return (
								name &&
								name !== '|' &&
								name !== '\n' &&
								!this.toolbar.getButtonsNames().includes(name)
							);
						});
					}
				}
			)
			.on(
				'showPopup',
				(elm: HTMLElement | string, rect: () => IBound) => {
					this.showPopupWithToolbar(
						rect,
						isString(elm) ? elm : elm.nodeName,
						isString(elm) ? undefined : elm
					);
				}
			)
			.on('click', this.onClick)
			.on(
				this.j.editorDocument,
				'selectionchange',
				this.onSelectionChange
			);
	}

	protected beforeDestruct(jodit: IJodit): void {
		this.j.e
			.off('showPopup')
			.off('click', this.onClick)
			.off(
				this.j.editorDocument,
				'selectionchange',
				this.onSelectionChange
			);
	}
}