tilesort-gallery
================

Plunk: http://plnkr.co/edit/gehNa1s62ipRcny5Uzkj?p=preview

This directive optionally uses the modules [xeditable](https://github.com/vitalets/angular-xeditable) and [Sortable](http://rubaxa.github.io/Sortable/). If you want to use them, you'll have to load them separately.

Syntax
======
```html
<tilesort-gallery
	images="images"
></tilesort-gallery>
```

Options
=======

option | values | default
------ | ------ | -------
mode | 'tiles', 'gallery' | 'gallery'
visible-modes | [] | []
start-index | int | 0
images | [] | none (required)
can-edit | bool | false (requires xeditable)
modalTpl | string | 'tilesort-modal-default'
modalCtrl | string | 'TilesortModalCtrl'
sortable | bool | false (requires ng-sortable)