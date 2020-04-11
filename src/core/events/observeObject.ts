/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright 2013-2020 Valeriy Chupurnov https://xdsoft.net
 */

import { CallbackFunction, IDictionary } from '../../types';
import { isPlainObject, isEqual } from '../helpers/checker';

export class ObserveObject {
	protected constructor(
		readonly data: IDictionary,
		readonly prefix: string[] = [],
		readonly onEvents: IDictionary<CallbackFunction[]> = {}
	) {
		Object.keys(data).forEach(key => {
			const prefix = this.prefix.concat(key).filter(a => a.length);

			Object.defineProperty(this, key, {
				set: value => {
					const oldValue = data[key];

					if (!isEqual(oldValue, value)) {
						this.fire(
							[
								'beforeChange',
								`beforeChange.${prefix.join('.')}`
							],
							key,
							value
						);

						if (isPlainObject(value)) {
							value = new ObserveObject(value, prefix, this.onEvents);
						}

						data[key] = value;

						this.fire(
							['change', `change.${prefix.join('.')}`],
							prefix.join('.'),
							value.valueOf ? value.valueOf() : value
						);
					}
				},
				get: () => {
					return data[key];
				}
			});

			if (isPlainObject(data[key])) {
				const value = new ObserveObject(data[key], prefix, this.onEvents);
				data[key] = value;
			}
		});
	}

	valueOf(): any {
		return this.data;
	}

	toString(): string {
		return JSON.stringify(this.valueOf());
	}

	/**
	 * Add listener on some changes
	 * @param event
	 * @param callback
	 */
	on(event: string | string[], callback: CallbackFunction): ObserveObject {
		if (Array.isArray(event)) {
			event.map(e => this.on(e, callback));
			return this;
		}

		if (!this.onEvents[event]) {
			this.onEvents[event] = [];
		}

		this.onEvents[event].push(callback);

		return this;
	}

	private __lockEvent: IDictionary<boolean> = {};

	private fire(event: string | string[], ...attr: any[]) {
		if (Array.isArray(event)) {
			event.map(e => this.fire(e, ...attr));
			return;
		}

		try {
			if (!this.__lockEvent[event] && this.onEvents[event]) {
				this.__lockEvent[event] = true;
				this.onEvents[event].forEach(clb => clb.call(this, ...attr));
			}
		} catch {
		} finally {
			this.__lockEvent[event] = false;
		}
	}

	static create<T, K extends T & ObserveObject = T & ObserveObject>(
		data: T,
		prefix: string[] = []
	): K {
		if (data instanceof ObserveObject) {
			return data as any;
		}

		return new ObserveObject(data, prefix) as any;
	}
}