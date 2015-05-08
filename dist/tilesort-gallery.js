'use strict';

angular.module('tilesortGallery', ['ui.bootstrap']).controller('TilesortModalCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {
  $scope.close = $modalInstance.close;
}]).directive('tilesortGallery', ['$modal', '$injector', function ($modal, $injector) {

  return {
    restrict: 'AE',
    scope: {
      mode: '=?',
      visibleModes: '=?',
      startIndex: '=?',
      images: '=',

      canEdit: '=?',

      modalTpl: '=?',
      modalCtrl: '=?',

      sortable: '=?'
    },
    templateUrl: 'tilesort-gallery-layout-default',
    link: function link(scope, element, attrs) {

      // the gallery mode -- by default, only gallery and tiles are available
      scope.mode = scope.mode || 'gallery';

      // the template for the modal
      scope.modalTpl = scope.modalTpl || 'tilesort-modal-default';

      // the controller for the modal
      scope.modalCtrl = scope.modalCtrl || 'TilesortModalCtrl';

      // the visible mode buttons
      scope.visibleModes = scope.visibleModes || [{ name: 'tiles', icon: 'fa fa-th' }, { name: 'gallery', icon: 'fa fa-square' }];

      var MAX_ITEMS = 3;

      // build the display list for animations to work properly
      var resetDisplayList = function resetDisplayList() {
        var list = [scope.images[scope.currentIndex]];
        var iterable = Math.floor(MAX_ITEMS / 2);

        for (var i = scope.currentIndex - 1; i >= scope.currentIndex - iterable; i--) {
          list.unshift(scope.images[i]);
        }

        for (var i = scope.currentIndex + 1; i <= scope.currentIndex + iterable; i++) {
          list.push(scope.images[i]);
        }

        scope.displayList = list;
      };

      // support hitting the left button
      // and rebuilding the display list accordingly
      scope.moveLeft = function () {
        if (scope.currentIndex === 0) return;
        scope.currentIndex = Math.max(0, scope.currentIndex - 1);

        scope.displayList.pop();
        scope.displayList.unshift(scope.images[scope.currentIndex - 1]);
      };

      // hit the right button, rebuild the display list
      scope.moveRight = function () {
        if (scope.currentIndex === scope.images.length - 1) return;
        scope.currentIndex = Math.min(scope.images.length - 1, scope.currentIndex + 1);

        scope.displayList.shift();
        scope.displayList.push(scope.images[scope.currentIndex + 1]);
      };

      // flat-out set the index and reset the display list
      scope.setIndex = function (newIndex) {
        scope.currentIndex = newIndex;
        resetDisplayList();
      };

      //internal; used to build the sortable / draggable tiles
      scope.sortableOptions = {
        onStart: function onStart(evt) {
          scope._currentIndex = scope.currentIndex;
        },
        onEnd: function onEnd(evt) {

          // move the currently active tile to compensate for sorting
          if (evt.oldIndex < scope._currentIndex && evt.newIndex >= scope._currentIndex) {
            scope.currentIndex--;
          }

          if (evt.oldIndex > scope._currentIndex && evt.newIndex <= scope._currentIndex) {
            scope.currentIndex++;
          }

          if (evt.oldIndex === scope._currentIndex) {
            scope.currentIndex = evt.newIndex;
          }
        }
      };

      // internal; open the modal with some sensible defaults
      scope.openModal = function () {
        $modal.open({
          scope: scope,
          controller: scope.modalCtrl,
          templateUrl: scope.modalTpl,
          backdrop: true,
          size: 'lg',
          windowClass: 'tilesort-modal'
        });
      };

      // whether or not sort should be enabled
      // alternatively, just don't load the plugin since this isn't watched
      if (!scope.sortable) {
        scope.sortableOptions.disabled = true;
      }

      // whether or not title / description are editable in the popup
      scope.canEdit = scope.canEdit || false;

      // if xeditable isn't available, turn editing off
      // an error will be thrown anyway if xeditable is not present
      // and canEdit is set to true, but this cleans up the display
      if (!$injector.has('editableOptions')) {
        scope.canEdit = false;
      }

      scope.$watch('images', function (newVal) {
        if (scope.currentIndex || Array.isArray(newVal) && newVal.length === 0 || typeof newVal === 'undefined') return;
        // initialize the directive
        scope.setIndex(scope.startIndex || 0);
      });
    }
  };
}]).run(['$templateCache', function ($templateCache) {

  // the modal
  // by default, it has the picture, an editable title and description, and close buttons
  $templateCache.put('tilesort-modal-default', '\n      <div class="modal-header">\n        <span class="item-title uneditable" ng-if="!canEdit">{{images[currentIndex].title}}</span>\n        <a class="item-title editable" ng-if="canEdit" href editable-text="images[currentIndex].title">{{images[currentIndex].title || \'no title\'}}</a>\n        <span class="fa fa-close pull-right close" ng-click="close()"></span>\n      </div>\n      <div class="modal-body">\n        <img class="fitted-image" ng-src="{{images[currentIndex].url}}" />\n\t\t<div class="item-description-container">\n          <span class="item-description uneditable" ng-if="!canEdit">{{images[currentIndex].description}}</span>\n          <a class="item-description editable" ng-if="canEdit" href editable-textarea="images[currentIndex].description">{{images[currentIndex].description || \'no description\'}}</a>\n        </div>\n      </div>\n      <div class="modal-footer">\n        <button class="btn btn-default" ng-click="close()">Close</button>\n      </div>\n    ');

  // the directive layout
  // by default, this renders the buttons in the bottom left
  // and has a reasonable amount of space (responsive) for the title / desc
  // it also has an expand button that opens the current image in a modal
  $templateCache.put('tilesort-gallery-layout-default', '\n      <div class="panel panel-default tilesort">\n        <div class="panel-body tilesort-container" ng-include="\'tilesort-view-\'+mode">\n        </div>\n        <div class="panel-footer">\n          <div class="btn-group col-md-2 col-xs-3">\n            <label class="btn btn-default" \n              ng-model="$parent.mode" \n              btn-radio="btn.name" \n              ng-repeat="btn in visibleModes">\n              \n              <i class="{{btn.icon}}"></i>\n            </label>\n          </div>\n          <div class="col-md-9 col-xs-7">\n            <span class="current-title">{{images[currentIndex].title}}</span>\n            <br>\n            <span class="current-description">{{images[currentIndex].description}}</span>\n          </div>\n          <span class="col-md-1 col-xs-2">\n            <label class="btn btn-default pull-right" ng-click="openModal()">\n              <i class="fa fa-expand"></i>\n            </label>\n          </span>\n        </div>\n      </div>\n    ');

  // the gallery layout
  // by default, there are niceish css transitions, left/right buttons, and
  // a reasonable amount of space to display info about the current image
  $templateCache.put('tilesort-view-gallery', '\n      <div class="tilesort-gallery-nav">\n        <span class="tilesort-gallery-nav-item tilesort-gallery-nav-left" \n          ng-click="moveLeft()" \n          ng-show="currentIndex > 0">\n          \n          <i class="fa fa-arrow-left"></i>\n        </span>\n        <span class="tilesort-gallery-nav-item tilesort-gallery-nav-right" \n          ng-click="moveRight()" \n          ng-show="currentIndex < images.length-1">\n          \n          <i class="fa fa-arrow-right"></i>\n        </span>\n      </div>\n      <div class="tilesort-gallery">\n        <img class="gallery-image"\n          ng-repeat="image in displayList track by $index+currentIndex-1" \n          ng-show="$index+currentIndex-1 >= 0 && $index+currentIndex-1 < images.length" \n          ng-src="{{images[$index+currentIndex-1].url}}" />\n          \n      </div>\n    ');

  // the tile layout
  // by default, the tiles have a tooltip for their title
  // and they're also drag/drop sortable
  // the active one is indicated by a glowing blue
  $templateCache.put('tilesort-view-tiles', '\n      <div class="tilesort-tiles" ng-sortable="sortableOptions">\n        <div class="tilesort-tile" \n          ng-repeat="tile in images" \n          ng-click="setIndex($index)" \n          tooltip="{{images[$index].title}}"\n          tooltip-append-to-body="true"\n          ng-class="{active: currentIndex === $index}">\n          \n          <img class="gallery-image" ng-src="{{images[$index].url}}" />\n        </div>\n      </div>\n    ');
}]);

// optionally load xeditable if it's there, and set the theme to bs3
try {
  angular.module('xeditable');
  angular.module('tilesortGallery').requires.push('xeditable');
  angular.module('tilesortGallery').run(['$injector', function ($injector) {
    if (!$injector.has('editableOptions')) return;
    $injector.get('editableOptions').theme = 'bs3';
  }]);
} catch (e) {}

// optionally load ng-sortable (Sortable.js) if it's available
try {
  angular.module('ng-sortable');
  angular.module('tilesortGallery').requires.push('ng-sortable');
} catch (e) {}