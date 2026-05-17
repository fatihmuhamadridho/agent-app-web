import { StringUtils } from './core/string';
import { ArrayUtils } from './core/array';
import { ObjectUtils } from './core/object';
import { NumberUtils } from './core/number';
import { FuncUtils } from './core/func';

export class Lodash {
  static readonly string = StringUtils;
  static readonly array = ArrayUtils;
  static readonly object = ObjectUtils;
  static readonly number = NumberUtils;
  static readonly func = FuncUtils;
}
