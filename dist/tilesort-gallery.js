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

            uploadImage: '=?',
            uploadProgress: '=',

            modalTpl: '=?',
            modalCtrl: '=?',

            sortable: '=?'
        },
        templateUrl: 'tilesort-gallery-layout-default',
        link: function link(scope, element, attrs) {
            scope.uploadImage = scope.uploadImage || false;
            scope.filesProgress = scope.uploadProgress;
            scope.$watch('uploadProgress', function() { //watch file upload progress when upload value increases
                scope.filesProgress = scope.uploadProgress;
            });

            // the gallery mode -- by default, only gallery and tiles are available
            scope.mode = scope.mode || 'gallery';

            // the template for the modal
            scope.modalTpl = scope.modalTpl || 'tilesort-modal-default';

            // the controller for the modal
            scope.modalCtrl = scope.modalCtrl || 'TilesortModalCtrl';

            // the visible mode buttons
            scope.visibleModes = scope.visibleModes || [{name: 'tiles', icon: 'fa fa-th'}, {
                    name: 'tiles-large',
                    icon: 'fa fa-th-large'
                }, {name: 'gallery', icon: 'fa fa-square'}];

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

            scope.onEnd = function (evt) {
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

                scope.$root.$emit('tilesort-resort-item-moved', {
                    newIndex: evt.newIndex,
                    oldIndex: evt.oldIndex
                });
            };
            //internal; used to build the sortable / draggable tiles
            scope.sortableOptions = {
                onStart: function onStart(evt) {
                    scope._currentIndex = scope.currentIndex;
                },
                onEnd: function onEnd(evt) {
                    scope.onEnd(evt);
                },
                onEndEvent: function onEndEvent(evt) {
                    scope.onEnd(evt);
                }
            };

            scope.sortableOptionsGallery = {
                sort: false
            };

            // internal; open the modal with some sensible defaults
            scope.openModal = function () {
                $modal.open({
                    scope: scope,
                    controller: scope.modalCtrl,
                    templateUrl: scope.modalTpl,
                    backdrop: true,
                    size: 'lg',
                    windowClass: 'tilesort-modal modal-fit',
                    resolve: {
                        scope: function () {
                            return _.cloneDeep(scope);
                        }
                    }
                }).result.then(function(response) {
                    scope.images[scope.currentIndex].title = response;
                });
            };

            // used by the gallery to allow selection of other images and opening the modal
            scope.selectAndOpen = function (index) {
                scope.setIndex(index);
                scope.openModal();
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
    $templateCache.put('tilesort-modal-default', '\n      <div class="modal-header">\n        <span class="item-title uneditable" ng-if="!canEdit">{{images[currentIndex].title}}</span>\n        <a class="item-title editable" ng-if="canEdit" href editable-text="images[currentIndex].title">{{images[currentIndex].title || \'no title\'}}</a>\n        <span class="fa fa-close pull-right close" ng-click="close()"></span>\n      </div>\n      <div class="modal-body">\n        <div class="fitted-image-container-container">\n          <div class="fitted-image-container">\n            <img class="fitted-image" ng-src="{{images[currentIndex].url}}" />\n          </div>\n        </div>\n\t      <div class="item-description-container">\n          <span class="item-description uneditable" ng-if="!canEdit">{{images[currentIndex].description}}</span>\n          <a class="item-description editable" ng-if="canEdit" href editable-textarea="images[currentIndex].description">{{images[currentIndex].description || \'no description\'}}</a>\n        </div>\n      </div>\n      <div class="modal-footer">\n        <button class="btn btn-default" ng-click="close()">Close</button>\n      </div>\n    ');

    // the directive layout
    // by default, this renders the buttons in the bottom left
    // and has a reasonable amount of space (responsive) for the title / desc //col-md-2 col-xs-3
    // it also has an expand button that opens the current image in a modal //class="col-md-1 col-xs-2"
    $templateCache.put('tilesort-gallery-layout-default', '\n' +
        '<nav class="navbar navbar-default">' +
            '<div class="container">' +
                '<div class="navbar-header col-xs-12 col-sm-2 col-md-2 col-lg-2" style="margin-left: -15px;">' +
                    '<a class="navbar-brand">Investigate</a>' +
                '</div>' +
                '<div class="col-xs-12 col-sm-5 col-md-6 col-lg-7">' +
                    '<span class="current-title metric-title" ng-class="{\'navbar-text\': !images[currentIndex].description}">{{images[currentIndex].title}}</span>' +
                    '<br>' +
                    '<div class="description-container" ng-if="images[currentIndex].description">' +
                        '<span class="current-description metric-description">{{images[currentIndex].description}}</span>' +
                    '</div>' +
                '</div>' +
                '<div class="col-xs-12 col-sm-5 col-md-4 col-lg-3">' +
                    '<div ng-show="filesProgress > 0">' +
                        '<div id="image-upload-progress-bar" class="nav navbar-text progress image-upload-progress">' +
                            '<div class="progress-bar" role="progressbar" ng-style="{width: filesProgress + \'%\'}">' +
                                '<span class="sr-only"></span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div ng-show="filesProgress === 0">' +
                        '<div class="btn-group pull-right">' +
                            '<button type="button" class="btn btn-default navbar-btn" ng-model="$parent.mode" btn-radio="btn.name" ng-repeat="btn in visibleModes">' +
                                '<i class="{{btn.icon}}"></i>' +
                            '</button>' +
                        '</div>' +
                        '<button type="button" class="btn btn-default navbar-btn pull-right margin-right-15" ng-click="openModal()" ng-disabled="images.length === 0" tooltip="View metric">' +
                            '<i class="fa fa-expand"></i>' +
                        '</button>' +
                        '<button type="button" class="btn btn-primary navbar-btn pull-right margin-right-15" ng-disabled="!canEdit" tooltip="Upload" ng-if="uploadImage && canEdit"' +
                            'ngf-select="uploadImage($files)"' +
                            'ngf-multiple="false"' +
                            'ngf-pattern="image/*"' +
                            'ngf-accept="\'image/*\'"' +
                            'ngf-max-size="5MB"' +
                            'ngf-select-disabled="!canEdit"' +
                            'ngf-drop-available="false"' +
                            '>' +
                                '<i class="fa fa-upload"></i>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</nav>' +
        '<div id="drag-drop-container" class="panel panel-default tilesort tilesort-margin-top" readonly="true" ng-if="uploadImage && canEdit"' +
            'ngf-drop="uploadImage($files)"' +
            'ngf-multiple="false"' +
            'ngf-pattern="image/*"' +
            'ngf-accept="\'image/*\'"' +
            'ngf-max-size="5MB"' +
            'ngf-drag-over-class="\'drag-drop-upload\'"' +
            'ngf-drop-disabled="!canEdit"' +
            '>' +
                '<div class="panel-body tilesort-container" ng-include="\'tilesort-view-\'+mode"></div>' +
        '</div>' +
        '<div id="drag-drop-container" class="panel panel-default tilesort tilesort-margin-top" readonly="true" ng-if="!(uploadImage && canEdit)">' +
            '<div class="panel-body tilesort-container" ng-include="\'tilesort-view-\'+mode"></div>' +
        '</div>'
    );

    // the gallery layout
    // by default, there are niceish css transitions, left/right buttons, and
    // a reasonable amount of space to display info about the current image
    $templateCache.put('tilesort-view-gallery', '\n      <div class="tilesort-gallery-nav">\n        <span class="tilesort-gallery-nav-item tilesort-gallery-nav-left"\n          ng-click="moveLeft()"\n          ng-show="currentIndex > 0">\n\n          <i class="fa fa-arrow-left"></i>\n        </span>\n        <span class="tilesort-gallery-nav-item tilesort-gallery-nav-right"\n          ng-click="moveRight()"\n          ng-show="currentIndex < images.length-1">\n\n          <i class="fa fa-arrow-right"></i>\n        </span>\n      </div>\n      <div class="tilesort-gallery" ng-sortable="sortableOptionsGallery">\n        <div\n          class="gallery-image-container"\n          ng-repeat="image in displayList track by $index"\n          ng-show="$index+currentIndex-1 >= 0 && $index+currentIndex-1 < images.length"\n          >\n          <img class="gallery-image"\n            ng-click="selectAndOpen($index+currentIndex-1)"\n            ng-src="{{images[$index+currentIndex-1].url}}" />\n        </div>\n\n      </div>\n    ');

    // the tile layout
    // by default, the tiles have a tooltip for their title
    // and they're also drag/drop sortable
    // the active one is indicated by a glowing blue
    $templateCache.put('tilesort-view-tiles', '\n      <div class="tilesort-tiles" ng-sortable="sortableOptions">\n        <div class="tilesort-tile"\n          ng-repeat="tile in images"\n          ng-click="setIndex($index)"\n          ng-class="{active: currentIndex === $index}">\n\n          <img class="gallery-image" ng-src="{{images[$index].url}}" />\n        </div>\n      </div>\n    ');

    $templateCache.put('tilesort-view-tiles-large', '\n      <div class="tilesort-tiles" ng-sortable="sortableOptions">\n        <div class="tilesort-tile-large"\n          ng-repeat="tile in images"\n          ng-click="setIndex($index)"\n          ng-class="{active: currentIndex === $index}">\n\n          <img class="gallery-image" ng-src="{{images[$index].url}}" />\n        </div>\n      </div>\n    ');
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