angular.module('tilesortGallery', ['ui.bootstrap'])

  .controller('TilesortModalCtrl', ['$scope', '$modalInstance', function($scope, $modalInstance) {
    $scope.close = $modalInstance.close;
  }])

  .directive('tilesortGallery', ['$modal', '$injector', function($modal, $injector) {
    
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
      link: function(scope, element, attrs) {
        
        // the gallery mode -- by default, only gallery and tiles are available
        scope.mode = scope.mode || 'gallery';
        
        // the template for the modal
        scope.modalTpl = scope.modalTpl || 'tilesort-modal-default';
        
        // the controller for the modal
        scope.modalCtrl = scope.modalCtrl || 'TilesortModalCtrl';
        
        // the visible mode buttons
        scope.visibleModes = scope.visibleModes || [
          { name: 'tiles', icon: 'fa fa-th' }, 
          { name: 'gallery', icon: 'fa fa-square' }
        ];
        
        var MAX_ITEMS = 3;
        
        // build the display list for animations to work properly
        var resetDisplayList = function() {
          var list = [scope.images[scope.currentIndex]];
          var iterable = Math.floor(MAX_ITEMS/2);

          for(var i = scope.currentIndex - 1; i >= scope.currentIndex - iterable; i--) {
            list.unshift(scope.images[i]);
          }
          
          for(var i = scope.currentIndex + 1; i <= scope.currentIndex + iterable; i++) {
            list.push(scope.images[i]);
          }
          
          scope.displayList = list;
        };
        
        // support hitting the left button
        // and rebuilding the display list accordingly
        scope.moveLeft = function() {
          if(scope.currentIndex === 0) return;
          scope.currentIndex = Math.max(0, scope.currentIndex-1);
          
          scope.displayList.pop();
          scope.displayList.unshift(scope.images[scope.currentIndex-1]);
        };
        
        // hit the right button, rebuild the display list
        scope.moveRight = function() {
          if(scope.currentIndex === scope.images.length-1) return;
          scope.currentIndex = Math.min(scope.images.length-1, scope.currentIndex+1);
          
          scope.displayList.shift();
          scope.displayList.push(scope.images[scope.currentIndex+1]);
        };
        
        // flat-out set the index and reset the display list
        scope.setIndex = function(newIndex) {
          scope.currentIndex = newIndex;
          resetDisplayList();
        };
        scope.onEnd = function(evt){
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
          onStart: function(evt) {
            scope._currentIndex = scope.currentIndex;
          },
          onEnd: function(evt) {
            scope.onEnd(evt);
          },
          onEndEvent: function(evt){
            scope.onEnd(evt);
          }
        };
        
        // internal; open the modal with some sensible defaults
        scope.openModal = function() {
          $modal.open({
            scope: scope,
            controller: scope.modalCtrl,
            templateUrl: scope.modalTpl,
            backdrop: true,
            size: 'lg',
            windowClass: 'tilesort-modal'
          });
        };

        // used by the gallery to allow selection of other images and opening the modal
        scope.selectAndOpen = function(index) {
          scope.setIndex(index);
          scope.openModal();
        }

        // whether or not sort should be enabled
        // alternatively, just don't load the plugin since this isn't watched
        if(!scope.sortable) {
          scope.sortableOptions.disabled = true;
        }
        
        // whether or not title / description are editable in the popup
        scope.canEdit = scope.canEdit || false;
        
        // if xeditable isn't available, turn editing off
        // an error will be thrown anyway if xeditable is not present
        // and canEdit is set to true, but this cleans up the display
        if(!$injector.has('editableOptions')) {
          scope.canEdit = false;
        }
        
		scope.$watch('images', function(newVal) {
          if(scope.currentIndex || (Array.isArray(newVal) && newVal.length === 0) || typeof newVal === 'undefined') return;
          // initialize the directive
          scope.setIndex(scope.startIndex || 0);
        });
      }
    }; 
  }])
  
  .run(['$templateCache', function($templateCache) {
    
    // the modal
    // by default, it has the picture, an editable title and description, and close buttons
    $templateCache.put('tilesort-modal-default', `
      <div class="modal-header">
        <span class="item-title uneditable" ng-if="!canEdit">{{images[currentIndex].title}}</span>
        <a class="item-title editable" ng-if="canEdit" href editable-text="images[currentIndex].title">{{images[currentIndex].title || 'no title'}}</a>
        <span class="fa fa-close pull-right close" ng-click="close()"></span>
      </div>
      <div class="modal-body">
        <img class="fitted-image" ng-src="{{images[currentIndex].url}}" />
		<div class="item-description-container">
          <span class="item-description uneditable" ng-if="!canEdit">{{images[currentIndex].description}}</span>
          <a class="item-description editable" ng-if="canEdit" href editable-textarea="images[currentIndex].description">{{images[currentIndex].description || 'no description'}}</a>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-default" ng-click="close()">Close</button>
      </div>
    `);
    
    // the directive layout
    // by default, this renders the buttons in the bottom left
    // and has a reasonable amount of space (responsive) for the title / desc
    // it also has an expand button that opens the current image in a modal
    $templateCache.put('tilesort-gallery-layout-default', `
      <div class="panel panel-default tilesort">
        <div class="panel-body tilesort-container" ng-include="'tilesort-view-'+mode">
        </div>
        <div class="panel-footer">
          <div class="btn-group col-md-2 col-xs-3">
            <label class="btn btn-default" 
              ng-model="$parent.mode" 
              btn-radio="btn.name" 
              ng-repeat="btn in visibleModes">
              
              <i class="{{btn.icon}}"></i>
            </label>
          </div>
          <div class="col-md-9 col-xs-7">
            <span class="current-title">{{images[currentIndex].title}}</span>
            <br>
            <span class="current-description">{{images[currentIndex].description}}</span>
          </div>
          <span class="col-md-1 col-xs-2">
            <label class="btn btn-default pull-right" ng-click="openModal()">
              <i class="fa fa-expand"></i>
            </label>
          </span>
        </div>
      </div>
    `);
    
    // the gallery layout
    // by default, there are niceish css transitions, left/right buttons, and
    // a reasonable amount of space to display info about the current image
    $templateCache.put('tilesort-view-gallery', `
      <div class="tilesort-gallery-nav">
        <span class="tilesort-gallery-nav-item tilesort-gallery-nav-left" 
          ng-click="moveLeft()" 
          ng-show="currentIndex > 0">
          
          <i class="fa fa-arrow-left"></i>
        </span>
        <span class="tilesort-gallery-nav-item tilesort-gallery-nav-right" 
          ng-click="moveRight()" 
          ng-show="currentIndex < images.length-1">
          
          <i class="fa fa-arrow-right"></i>
        </span>
      </div>
      <div class="tilesort-gallery">
        <div 
          class="gallery-image-container" 
          ng-repeat="image in displayList track by $index" 
          ng-show="$index+currentIndex-1 >= 0 && $index+currentIndex-1 < images.length"
          >
          <img class="gallery-image"
            ng-click="selectAndOpen($index+currentIndex-1)"
            ng-src="{{images[$index+currentIndex-1].url}}" />
        </div>
          
      </div>
    `);
    
    // the tile layout
    // by default, the tiles have a tooltip for their title
    // and they're also drag/drop sortable
    // the active one is indicated by a glowing blue
    $templateCache.put('tilesort-view-tiles', `
      <div class="tilesort-tiles" ng-sortable="sortableOptions">
        <div class="tilesort-tile" 
          ng-repeat="tile in images" 
          ng-click="setIndex($index)" 
          tooltip="{{images[$index].title}}"
          tooltip-append-to-body="true"
          ng-class="{active: currentIndex === $index}">
          
          <img class="gallery-image" ng-src="{{images[$index].url}}" />
        </div>
      </div>
    `);
    
  }]);
  
// optionally load xeditable if it's there, and set the theme to bs3
try {
  angular.module('xeditable');
  angular.module('tilesortGallery').requires.push('xeditable');
  angular.module('tilesortGallery').run(['$injector', function($injector) {
    if(!$injector.has('editableOptions')) return;
    $injector.get('editableOptions').theme = 'bs3';
  }]);
} catch(e) {}

// optionally load ng-sortable (Sortable.js) if it's available
try {
  angular.module('ng-sortable');
  angular.module('tilesortGallery').requires.push('ng-sortable');
} catch(e) {}
