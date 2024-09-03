import '../sass/style.scss';

import { $, $$ } from './modules/bling';
import typeAhead from './modules/typeahead';
import ajaxHeart from './modules/heart';

typeAhead( $('.search') );

$$('form.heart').on('submit', ajaxHeart);