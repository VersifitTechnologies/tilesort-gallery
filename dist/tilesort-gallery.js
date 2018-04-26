'use strict';

angular.module('tilesortGallery', ['ui.bootstrap']).controller('TilesortModalCtrl', ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {
    $scope.close = $uibModalInstance.close;
}]).directive('tilesortGallery', ['$uibModal', '$injector', '$http', '$timeout', '$state', 'Upload', 'baseURL', 'urlParser', 'URLS', 'notificationService', function ($uibModal, $injector, $http, $timeout, $state, Upload, baseURL, urlParser, URLS, PNotify) {

    return {
        restrict: 'AE',
        scope: {
            mode: '=?',
            visibleModes: '=?',
            startIndex: '=?',
            planName: '=',
            images: '=',
            imageGalleryTpl: '=',
            imageGalleryCtrl: '=',
            layoutId: '=?',

            canEdit: '=?',

            refreshImages: '=',

            modalTpl: '=?',
            modalCtrl: '=?'
        },
        templateUrl: 'tilesort-gallery-layout-default',
        link: function link(scope, element, attrs) {
            scope.params = urlParser.search($state.params);

            scope.filteredImages = []; //images filtered based on passed image id

            scope.filesProgress = 0; //keeps track of the image uploading progress

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
                var list = [scope.filteredImages[scope.currentIndex]];
                var iterable = Math.floor(MAX_ITEMS / 2);

                for (var i = scope.currentIndex - 1; i >= scope.currentIndex - iterable; i--) {
                    list.unshift(scope.filteredImages[i]);
                }

                for (var i = scope.currentIndex + 1; i <= scope.currentIndex + iterable; i++) {
                    list.push(scope.filteredImages[i]);
                }

                scope.displayList = list;
            };

            // support hitting the left button
            // and rebuilding the display list accordingly
            scope.moveLeft = function () {
                if (scope.currentIndex === 0) return;
                scope.currentIndex = Math.max(0, scope.currentIndex - 1);

                scope.displayList.pop();
                scope.displayList.unshift(scope.filteredImages[scope.currentIndex - 1]);
            };

            // hit the right button, rebuild the display list
            scope.moveRight = function () {
                if (scope.currentIndex === scope.filteredImages.length - 1) return;
                scope.currentIndex = Math.min(scope.filteredImages.length - 1, scope.currentIndex + 1);

                scope.displayList.shift();
                scope.displayList.push(scope.filteredImages[scope.currentIndex + 1]);
            };

            // flat-out set the index and reset the display list
            scope.setIndex = function (newIndex) {
                scope.currentIndex = newIndex;
                resetDisplayList();
            };

            scope.onEnd = function (evt) {
                if (evt.newIndex === undefined) { return ; } //if sorting order wasn't updated, don't update index

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
                    filteredImages: scope.filteredImages,
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
            scope.openModal = function (image) {
                if (scope.images.length === 0 || typeof(image) === 'undefined') { return ; } //if no images, don't open modal

                $uibModal.open({
                    scope: scope,
                    controller: scope.modalCtrl,
                    templateUrl: scope.modalTpl,
                    backdrop: true,
                    size: 'lg',
                    windowClass: 'tilesort-modal modal-fit',
                    resolve: {
                        scope: function () {
                            return scope;
                        },
                        image: function() {
                            return image;
                        }
                    }
                })/*.result.then(function(response) {
                    scope.images[scope.currentIndex].title = response;
                })*/;
            };

            scope.openImageGallery = function () {
                $uibModal.open({
                    scope: scope,
                    controller: scope.imageGalleryCtrl,
                    templateUrl: scope.imageGalleryTpl,
                    backdrop: true,
                    size: 'lg',
                    windowClass: 'tilesort-modal modal-fit fix-modal-content',
                    resolve: {
                        scope: function () {
                            return scope;
                        }
                    }
                })
            };

            // used by the gallery to allow selection of other images and opening the modal
            scope.selectAndOpen = function (index) {
                scope.setIndex(index);
                scope.openModal(scope.filteredImages[scope.currentIndex]);
            };

            //this function allows multiple image uploading and is sent to the tilesort-gallery directive
            scope.uploadImage = function(inFiles, layoutId) {
                if (inFiles.length === 0) { return ; } //if no files are being uploaded, cancel upload

                var numFilesUploaded = 0; //keep track of how many files has been uploaded (used to know when last image has been reached to refresh images)
                var files = [];
                if (inFiles instanceof Array)
                    files = inFiles;
                else if (inFiles)
                    files[0] = inFiles;

                _.forEach(files, function(file) {
                    Upload.upload({
                        url: baseURL + '/ngFileUpload/file/UserForms',
                        data: { file: file},
                        resumeChunkSize: '512KB'
                    }).then(function (response) {
                        $timeout(function () {
                            scope.errorMsg1 = '';

                            var params = {sys_json_data: _.cloneDeep(scope.params)};

                            if (!params.sys_json_data.sys_posted_values) {
                                params.sys_json_data.sys_posted_values = {};
                            }

                            //assign layout Id to the image file so that we know which image listing this image belongs to
                            params.sys_json_data.sys_posted_values.layoutitemid = layoutId;
                            params.sys_json_data.fileinfo = response.data;

                            $http.put(URLS.image, params).then(function () {
                                numFilesUploaded = numFilesUploaded + 1;

                                //refresh images only when the last file has been reached
                                if (numFilesUploaded === files.length) {
                                    scope.refreshImages(true).then(res => { //refresh images
                                        scope.images.length = 0;
                                        [].push.apply(scope.images, res.data.images);
                                    });

                                    $timeout(function() {
                                        scope.filesProgress = 0;
                                    }, 1000);
                                }
                            });
                        });
                    }, function (response) {
                        numFilesUploaded = numFilesUploaded + 1;

                        //refresh images only when the last file has been reached
                        if (numFilesUploaded === files.length) {
                            scope.refreshImages(true).then(res => { //refresh images
                                scope.images.length = 0;
                                [].push.apply(scope.images, res.data.images);
                            });

                            $timeout(function() {
                                scope.filesProgress = 0;
                            }, 1000);
                        }

                        if (response.status > 0){
                            //Call pnotify here
                            PNotify.notify({
                                title: response.data.errorLabel,
                                text: response.data.errorMessage,
                                type: 'error'
                            });
                        }
                    }, function (evt) {
                        if (evt.type === 'progress' || evt.type === 'load')
                            scope.filesProgress = Math.min(100,parseInt(100.0 * evt.loaded / evt.total ));
                    });
                });
            };

            scope.$watch('canEdit', function() {
                scope.sortableOptions.disabled = !scope.canEdit; //if user cannot edit, disable sort
                scope.canEdit = scope.canEdit;
            });

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

            scope.$watchCollection('images', function (newVal) {
                //set plan name when Plan data has returned from back-end
                scope.planName = scope.planName;

                if (scope.layoutId) {
                    scope.filteredImages = _.filter(scope.images, function(image) {
                        return image.layoutitemid === scope.layoutId;
                    });
                } else { //if no layout id is specified, display all images
                    scope.filteredImages = scope.images;
                }

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
                        '<h4 class="card-title">{{filteredImages[currentIndex].title}}</h4>' +
                        '<ul class="card-actions pl-4">' +
                            '<li>' +
                                '<button type="button" class="btn-toggle-state" ng-disabled="!canUpload(canEdit)" uib-tooltip="Upload"  tooltip-append-to-body="true" ng-if="uploadImage && canEdit"' +
                                    'ngf-select="uploadImage($files, layoutId)"' +
                                    'ngf-multiple="false"' +
                                    'ngf-pattern="image/*"' +
                                    'ngf-accept="\'image/*\'"' +
                                    'ngf-max-size="5MB"' +
                                    'ngf-select-disabled="!canEdit"' +
                                    'ngf-drop-available="false"' +
                                    '>' +
                                    '<svg class="icon" width="20" height="20" fill="#5b7482" transform="translate(2.000000, 0.000000)">' +
                                        '<use xlink:href="#shape-icon_upload"></use>' +
                                    '</svg>' +
                                '</button>' +
                            '</li>' +
                            '<li class="pl-5">' +
                                '<button type="button" class="btn-toggle-state" ng-click="openImageGallery()" ng-disabled="filesProgress > 0" ng-if="canEdit" uib-tooltip="Image Gallery" tooltip-append-to-body="true">' +
                                    '<svg class="icon" width="21" height="21" fill="#5b7482" transform="translate(2.000000, 0.000000)">' +
                                        '<use xlink:href="#shape-icon_image"></use>' +
                                    '</svg>' +
                                '</button>' +
                            '</li>' +
                            '<li class="padding-left-48">' +
                                '<button type="button" class="btn-toggle-state" ng-click="openModal(filteredImages[currentIndex])" ng-disabled="filesProgress > 0" uib-tooltip="Properties" tooltip-append-to-body="true">' +
                                    '<svg class="icon" width="18" height="18" fill="#5b7482">' +
                                        '<use xlink:href="#shape-share"></use>' +
                                    '</svg>' +
                                '</button>' +
                            '</li>' +
                            '<li class="pl-5">' +
                                '<button type="button" class="btn-toggle-state" ng-click="changeMode(\'tiles\')" ng-disabled="filesProgress > 0" uib-tooltip="Re-order" tooltip-append-to-body="true">' +
                                    '<svg class="icon" width="22" height="22" fill="#5b7482">' +
                                        '<use xlink:href="#shape-icon_move_arrows"></use>' +
                                    '</svg>' +
                                '</button>' +
                            '</li>' +
                            '<li class="pl-5">' +
                                '<button type="button" class="btn-toggle-state" ng-click="changeMode(\'gallery\')" ng-disabled="filesProgress > 0" uib-tooltip="View Only" tooltip-append-to-body="true">' +
                                    '<svg class="icon" width="20" height="20" fill="#5b7482" transform="translate(0.000000, 2.000000)">' +
                                        '<use xlink:href="#shape-icon_view_carousel"></use>' +
                                    '</svg>' +
                                '</button>' +
                            '</li>' +
                        '</ul>' +
                    '</header>' +
                    '<div class="card-block bg-faded" ng-if="filteredImages[currentIndex].description">' +
                        '<div>{{filteredImages[currentIndex].description}}</div>' +
                    '</div>' +
                    '<div class="card-block image-gallery-height overflow-hidden padding-left-14 padding-right-14" ng-class="{\'image-gallery-height-no-images\': filteredImages.length === 0}">' +
                        '<div class="panel panel-default tilesort" readonly="true" ng-if="uploadImage && canEdit"' +
                            'ngf-drop="uploadImage($files, layoutId)"' +
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
            '<span class="tilesort-gallery-nav-item tilesort-gallery-nav-right" ng-click="moveRight()" ng-show="currentIndex < filteredImages.length-1">' +
                '<svg class="icon position-arrow" width="14" height="14" fill="#5b7482">' +
                    '<use xlink:href="#shape-arrow-right"></use>' +
                '</svg>' +
            '</span>' +
        '</div>' +
        '<div class="tilesort-gallery" ng-sortable="sortableOptionsGallery">' +
            '<div class="gallery-image-container" ng-repeat="image in displayList track by $index" ng-show="filteredImages.length !== 0" ng-class="{\'cursor\': ($index+currentIndex-1 >= 0 && $index+currentIndex-1 < filteredImages.length) ? \'pointer\' : \'auto\'}">' +
                '<img class="gallery-image image-box-shadow" ng-click="selectAndOpen($index+currentIndex-1)" ng-show="$index+currentIndex-1 >= 0 && $index+currentIndex-1 < filteredImages.length" ng-src="{{filteredImages[$index+currentIndex-1].url}}" />' +
            '</div>' +
            '<div class="text-center margin-top-25" ng-if="filteredImages.length === 0">' +
                '<div>There are no images.</div>' +
            '</div>' +
        '</div>'
    );

    // the tile layout
    // by default, the tiles have a tooltip for their title
    // and they're also drag/drop sortable
    // the active one is indicated by a glowing blue
    $templateCache.put('tilesort-view-tiles', '\n' +
        '<div class="tilesort-tiles" ng-sortable="sortableOptions">' +
            '<div class="tilesort-tile" ng-repeat="tile in filteredImages" ng-click="setIndex($index)" ng-class="{active: currentIndex === $index, \'box-shadow\': currentIndex !== $index}">' +
                '<span class="center-image"></span>'+
                '<img class="gallery-image" ng-src="{{filteredImages[$index].url}}" />' +
            '</div>' +
        '</div>' +
        '<div class="text-center margin-top-25" ng-if="filteredImages.length === 0">' +
            '<div>There are no images.</div>' +
        '</div>'
    );

    $templateCache.put('tilesort-view-tiles-large', '\n' +
        '<div class="tilesort-tiles" ng-sortable="sortableOptions">' +
            '<div class="tilesort-tile-large" ng-repeat="tile in filteredImages" ng-click="setIndex($index)" ng-class="{active: currentIndex === $index}">' +
                '<img class="gallery-image" ng-src="{{filteredImages[$index].url}}" />' +
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
