'use strict';

angular.module('tilesortGallery', ['ui.bootstrap']).controller('TilesortModalCtrl', ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {
    $scope.close = $uibModalInstance.close;
}]).directive('tilesortGallery', ['$uibModal', '$injector', function ($uibModal, $injector) {

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
            modalCtrl: '=?'
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
                scrollSpeed: 20,
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
                $uibModal.open({
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

            scope.$watch('canEdit', function() {
                scope.sortableOptions.disabled = !scope.canEdit; //if user cannot edit, disable sort
            });

            // whether or not title / description are editable in the popup
            scope.canEdit = scope.canEdit || false;

            scope.canUpload = function(canEdit) {
                //They can upload if they have edit permission and an upload isn't happeneing already
                return canEdit && scope.filesProgress === 0;
            };

            scope.changeMode = function(mode) {
                scope.mode = mode;
            };

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
    $templateCache.put('tilesort-modal-default', '\n      <div class="modal-header">\n        <span class="item-title uneditable" ng-if="!canEdit">{{images[currentIndex].title}}</span>\n        <a class="item-title editable" ng-if="canEdit" href editable-text="images[currentIndex].title">{{images[currentIndex].title || \'no title\'}}</a>\n        <span class="fa fa-close pull-right close" ng-click="close()"></span>\n      </div>\n      <div class="modal-body">\n        <div class="fitted-image-container-container">\n          <div class="fitted-image-container">\n            <img class="fitted-image" ng-src="{{images[currentIndex].url}}" />\n          </div>\n        </div>\n\t      <div class="item-description-container">\n          <span class="item-description uneditable" ng-if="!canEdit">{{images[currentIndex].description}}</span>\n          <a class="item-description editable" ng-if="canEdit" href editable-textarea="images[currentIndex].description">{{images[currentIndex].description || \'no description\'}}</a>\n        </div>\n      </div>\n      <div class="modal-footer">\n        <button class="btn btn-secondary" ng-click="close()">Close</button>\n      </div>\n    ');

    // the directive layout
    // by default, this renders the buttons in the bottom left
    // and has a reasonable amount of space (responsive) for the title / desc //col-md-2 col-xs-3
    // it also has an expand button that opens the current image in a modal //class="col-md-1 col-xs-2"
    $templateCache.put('tilesort-gallery-layout-default', '\n' +
        '<div class="row mb-3" ng-show="filesProgress > 0">' +
            '<div class="col">' +
                '<div class="progress">' +
                    '<div class="progress-bar" role="progressbar" ng-style="{width: filesProgress + \'%\'}"></div>' +
                '</div>' +
            '</div>' +
        '</div>' +

        '<div class="row">' +
            '<div class="col">' +
                '<div class="card card-border metric-container">' +
                    '<header class="card-header">' +
                        '<h4 class="card-title">{{images[currentIndex].title}}</h4>' +
                        '<ul class="card-actions pl-4">' +
                            '<li>' +
                                '<button type="button" class="btn-toggle-state" ng-disabled="!canUpload(canEdit)" uib-tooltip="Upload"  tooltip-append-to-body="true" ng-if="uploadImage && canEdit"' +
                                    'ngf-select="uploadImage($files)"' +
                                    'ngf-multiple="false"' +
                                    'ngf-pattern="image/*"' +
                                    'ngf-accept="\'image/*\'"' +
                                    'ngf-max-size="5MB"' +
                                    'ngf-select-disabled="!canEdit"' +
                                    'ngf-drop-available="false"' +
                                    '>' +
                                    '<svg class="icon" width="18" height="18" fill="#5b7482">' +
                                        '<use xlink:href="#shape-edit"></use>' +
                                    '</svg>' +
                                '</button>' +
                            '</li>' +
                            '<li class="padding-left-48">' +
                                '<button type="button" class="btn-toggle-state" ng-click="openModal()" ng-disabled="images.length === 0 || filesProgress > 0" uib-tooltip="View metric" tooltip-append-to-body="true">' +
                                    '<svg class="icon" width="18" height="18" fill="#5b7482">' +
                                        '<use xlink:href="#shape-edit"></use>' +
                                    '</svg>' +
                                '</button>' +
                            '</li>' +
                            '<li class="pl-5">' +
                                '<button type="button" class="btn-toggle-state" ng-click="changeMode(\'tiles\')" ng-disabled="filesProgress > 0" uib-tooltip="Sort mode" tooltip-append-to-body="true">' +
                                    '<svg class="icon" width="18" height="18" fill="#5b7482">' +
                                        '<use xlink:href="#shape-edit"></use>' +
                                    '</svg>' +
                                '</button>' +
                            '</li>' +
                            '<li class="pl-5">' +
                                '<button type="button" class="btn-toggle-state" ng-click="changeMode(\'gallery\')" ng-disabled="filesProgress > 0" uib-tooltip="View mode" tooltip-append-to-body="true">' +
                                    '<svg class="icon" width="18" height="18" fill="#5b7482">' +
                                        '<use xlink:href="#shape-edit"></use>' +
                                    '</svg>' +
                                '</button>' +
                            '</li>' +
                        '</ul>' +
                    '</header>' +
                    '<div class="card-block bg-faded" ng-if="images[currentIndex].description">' +
                        '<div>{{images[currentIndex].description}}</div>' +
                    '</div>' +
                    '<div class="card-block image-gallery-height padding-left-14 padding-right-14">' +
                        '<div class="panel panel-default tilesort" readonly="true" ng-if="uploadImage && canEdit"' +
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
                        '<div class="panel panel-default tilesort" readonly="true" ng-if="!(uploadImage && canEdit)">' +
                            '<div class="panel-body tilesort-container" ng-include="\'tilesort-view-\'+mode"></div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>'
    );

    // the gallery layout
    // by default, there are niceish css transitions, left/right buttons, and
    // a reasonable amount of space to display info about the current image
    $templateCache.put('tilesort-view-gallery', '\n' +
        '<div class="tilesort-gallery-nav">' +
            '<span class="tilesort-gallery-nav-item tilesort-gallery-nav-left" ng-click="moveLeft()" ng-show="currentIndex > 0">' +
                '<svg class="icon position-arrow" width="14" height="14" fill="#5b7482">' +
                    '<use xlink:href="#shape-arrow-left"></use>' +
                '</svg>' +
            '</span>' +
            '<span class="tilesort-gallery-nav-item tilesort-gallery-nav-right" ng-click="moveRight()" ng-show="currentIndex < images.length-1">' +
                '<svg class="icon position-arrow" width="14" height="14" fill="#5b7482">' +
                    '<use xlink:href="#shape-arrow-right"></use>' +
                '</svg>' +
            '</span>' +
        '</div>' +
        '<div class="tilesort-gallery" ng-sortable="sortableOptionsGallery">' +
            '<div class="gallery-image-container" ng-repeat="image in displayList track by $index" ng-show="$index+currentIndex-1 >= 0 && $index+currentIndex-1 < images.length">' +
                '<img class="gallery-image image-box-shadow" ng-click="selectAndOpen($index+currentIndex-1)" ng-src="{{images[$index+currentIndex-1].url}}" />' +
            '</div>' +
        '</div>'
    );

    // the tile layout
    // by default, the tiles have a tooltip for their title
    // and they're also drag/drop sortable
    // the active one is indicated by a glowing blue
    $templateCache.put('tilesort-view-tiles', '\n' +
        '<div class="tilesort-tiles" ng-sortable="sortableOptions">' +
            '<div class="tilesort-tile" ng-repeat="tile in images" ng-click="setIndex($index)" ng-class="{active: currentIndex === $index}">' +
                '<img class="gallery-image" ng-src="{{images[$index].url}}" />' +
            '</div>' +
        '</div>'
    );

    $templateCache.put('tilesort-view-tiles-large', '\n' +
        '<div class="tilesort-tiles" ng-sortable="sortableOptions">' +
            '<div class="tilesort-tile-large" ng-repeat="tile in images" ng-click="setIndex($index)" ng-class="{active: currentIndex === $index}">' +
                '<img class="gallery-image" ng-src="{{images[$index].url}}" />' +
            '</div>' +
        '</div>'
    );
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
