/**
 * Controller for the wall screen.
 * If there is a stateParam "postId", then a single message is shown.
 * If there is a stateParam "coachUsername", then only messages to/from this specific coach are
 * shown and the user can send a new message.
 */
define([
  'app-modules',
  'moment',
  'services/user-prefs-service',
  'services/coaching-communication',
  'services/wall-communication'
], function(appModules, moment) {
  
  appModules.controllers.controller('wallController', [
    '$scope',
    'CoachingCommunicationService',
    'WallCommunicationService',
    'UserPrefsService',
    '$ionicActionSheet',
    '$stateParams',
    '$state',
    '$ionicModal',
    '$timeout',
    function($scope, coachingCom, wallCom, userPrefs, $ionicActionSheet, $stateParams, $state, $ionicModal, $timeout) {
      
      // True if only one post is being displayed
      $scope.singlePost = $stateParams.postId ? true : false;
      
      // Username of the coach (if in coach mode)
      $scope.coachFilter = $stateParams.coachUsername;
      
      // Actual name (fullname) of the coach (if any)
      if ($scope.coachFilter) {
        $scope.coachName = coachingCom.getCoachByUsername($stateParams.coachUsername).fullname;
      }
      
      // List of posts on the wall (array ; null before it was first loaded)
      $scope.postList = null;
      
      // Id of the last post of the list
      $scope.lastPostId = null;
      
      // Whether the bottom of the wall has been reached
      $scope.lastPostLoaded = false;
      
      // Whether a refresh is in progress
      $scope.refreshing = true;
      
      // True until the list has been initialized
      $scope.loading = true;
      
      // "yes" or "no" when whether the user has a coach has been determined
      $scope.hasCoach = "";
      
      // True if the device has an internet connection
      $scope.isOnline = forge.is.connection.connected();
      
      // URL of the local user's photo
      $scope.localUserPhotoURL = userPrefs.get('login.photoURL');
      
      // True when editing a new message for the coach (when coachFilter is on only)
      $scope.editNewMessage = false;
      
      // True if the new message is currently being sent
      $scope.sendingMessage = false;
      
      // The new message being edited by the user
      $scope.newMessage = {
        body: ""
      };
      
      // Check whether the user has a coach
      coachingCom.getCoachList(
        // Success
        function(coachList) {
          if (coachList.length) $scope.hasCoach = "yes";
          else $scope.hasCoach = "no";
          if ($scope.postList) $scope.loading = false;
          $scope.$$phase || $scope.$apply();
        },
        // Error
        function(content) {
          forge.logging.error("Error while fetching coach list: " + JSON.stringify(content));
        }
      );
      
      /**
       * [Called from page] Returns the title to be displayed in the header
       */
      $scope.getPageTitle = function() {
        if ($scope.singlePost) {
          // Showing a single message
          return "Message";
        }
        if ($scope.coachFilter) {
          // Showing to interaction with a given coach
          return "Messaging with " + $scope.coachName;
        }
        // Showing the wall
        return "All Messages";
      };
      
      /**
       * Sorts posts by date
       */
      $scope.sortPosts = function() {
        $scope.postList.sort(function(a, b) {
          return a.creationTime > b.creationTime ? -1 : a.creationTime === b.creationTime ? 0 : 1;
        });
      };
      
      /**
       * Convert timestamp to human readable time
       */
      $scope.convertTime = function(time) {
        return moment(time).fromNow();
      };
      
      /**
       * [Called from page] Loads the screen that presents a post with its comments
       */
      $scope.loadPost = function(post) {
        $state.go("wallPost", {postId: post.id});
      };
      
      // Refresh time display periodically
      $scope.refreshTimesTimeout = null;
      $scope.refreshTimes = function() {
        $scope.$$phase || $scope.$apply();
        $scope.refreshTimesTimeout = $timeout($scope.refreshTimes, 20000);
      };
      $scope.refreshTimesTimeout = $timeout($scope.refreshTimes, 20000);
      $scope.$on("$destroy", function() {
        $timeout.cancel($scope.refreshTimesTimeout);
      })
      
      /**
       * Loads additional posts from the server to complete the wall
       */
      $scope.loadMorePosts = function() {
        // Check if we are offline
        if (!$scope.isOnline) {
          $scope.$broadcast('scroll.infiniteScrollComplete');
          $scope.$broadcast('scroll.refreshComplete');
          return;
        }
        // Check if the bottom of the wall has already been reached
        if ($scope.lastPostLoaded) {
          return;
        }
        // Load more posts
        wallCom.getWallPosts($scope.lastPostId,
          // Success
          function(posts, lastPostId) {
            // Add posts
            $scope.postList = posts;
            $scope.sortPosts();
            $scope.lastPostId = lastPostId;
            // Check if end of wall has been reached
            if (posts.length < wallCom.postCountPerQuery) {
              $scope.lastPostLoaded = true;
            }
            // Refresh UI
            $scope.listFullyLoaded = false;
            $scope.refreshing = false;
            if ($scope.hasCoach || $scope.postList.length) $scope.loading = false;
            $scope.$$phase || $scope.$apply();
            $scope.$broadcast('scroll.infiniteScrollComplete');
            $scope.$broadcast('scroll.refreshComplete');
          },
          // Error
          function(content) {
            forge.logging.error("Error while fetching wall posts: " + JSON.stringify(content));
            $scope.$broadcast('scroll.infiniteScrollComplete');
            $scope.$broadcast('scroll.refreshComplete');
          }
        );
      };
      
      $scope.loadSinglePost = function() {
        wallCom.getWallPost(
          // Id
          $stateParams.postId,
          // Preload
          function(post) {
            if (!$scope.postList || $scope.postList.length == 0) {
              $scope.postList = [post];
              $scope.loading = false;
              $scope.$$phase || $scope.$apply();
            }
          },
          // Success
          function(post) {
            $scope.postList = [post];
            $scope.loading = false;
            $scope.$$phase || $scope.$apply();
            $scope.$broadcast('scroll.refreshComplete');
          },
          // Error
          function(content) {
            forge.logging.error("Error while fetching post: " + JSON.stringify(content));
            $scope.$broadcast('scroll.refreshComplete');
          }
        );
      };
      
      /**
       * Clears and redownloads the wall posts
       */
      $scope.refreshWall = function() {
        if ($scope.singlePost) {
          $scope.loadSinglePost();
        } else {
          // Populate wall with cached data
          $scope.postList = wallCom.getCachedWallPosts();
          $scope.sortPosts();
          if ($scope.postList.length) $scope.loading = false;
          $scope.$$phase || $scope.$apply();
          
          // Reset known information
          $scope.lastPostLoaded = false;
          $scope.lastPostId = null;
          
          if (forge.is.connection.connected()) {
            $scope.refreshing = true;
            $scope.$$phase || $scope.$apply();
            $scope.loadMorePosts();
          } else {
            $scope.$broadcast('scroll.refreshComplete');
          }
        }
      };
      
      // Load at start
      $scope.refreshWall();
      
      // Update online status when connection state changes
      forge.event.connectionStateChange.addListener(
        function() {
          $scope.isOnline = forge.is.connection.connected();
          $scope.$$phase || $scope.$apply();
          // If the device is now connected, refresh the wall data
          if (forge.is.connection.connected()) {
            $scope.refreshWall();
          }
        }
      );
      
      /**
       * Disable the editing of all comments within this page
       */
      $scope.disableAllEditBoxes = function() {
        // Mark all posts' new comment as not being edited
        $scope.postList.forEach(function(post) {
          post.editingNewComment = false;
          if (post.comments) {
            post.comments.forEach(function(comment) {
              comment.editing = false;
            });
          }
        });
      };
      
      /**
       * [Called from page] Enables the edition of a new comment for the given post
       */
      $scope.editNewComment = function(post) {
        // Disable other edition
        $scope.disableAllEditBoxes();
        // Mark post as being edited
        post.editingNewComment = true;
        $scope.$$phase || $scope.$apply();
        // Focus on textarea
        $timeout(function() {
          $("textarea:visible").focus();
        }, 0);
      };
      
      /**
       * [Called from page] Uploads the new comment
       */
      $scope.submitNewComment = function(post) {
        if (post.newComment) {
          var comment = {
            body: post.newComment,
            creationTime: moment().format()
          };
          if (!post.comments) post.comments = [];
          post.comments.push(comment);
          post.editingNewComment = false;
          post.newComment = "";
          $scope.$$phase || $scope.$apply();
          wallCom.addComment(post.id, comment.body,
            // Success
            function() {},
            // Error
            function() {
              forge.logging.error("An error occurred while pushing a comment");
            }
          );
        }
      };
      
      /**
       * [Called from pages] Presents the user with a confirmation box and then deletes an existing comment
       */
      $scope.deleteComment = function(post, comment) {
        var hideActionSheet = $ionicActionSheet.show({
          destructiveText: 'Yes, Delete',
          titleText: 'Delete this comment?',
          cancelText: 'Cancel',
          destructiveButtonClicked: function(index) {
            // Remove coach now
            post.comments.splice(post.comments.indexOf(comment), 1);
            $scope.$$phase || $scope.$apply();
            wallCom.deleteComment(post.id, comment.id,
              // Success
              function() {},
              // Error
              function() {
                forge.logging.error("Error while deleting comment");
              }
            );
            return true;
          }
        });
      };
      
      /**
       * [Called from page] Enables the edition of an existing comment
       */
      $scope.editComment = function(post, comment) {
        // Disable active comment
        $scope.disableAllEditBoxes();
        // Mark as editing
        comment.editing = true;
        comment.newBody = comment.body;
        $scope.$$phase || $scope.$apply();
        // Focus on textarea
        $timeout(function() {
          $("textarea:visible").focus();
        }, 0);
      };
      
      /**
       * [Called from page] Uploads the changes made to an existing comment
       */
      $scope.submitCommentUpdate = function(post, comment) {
        comment.editing = false;
        comment.body = comment.newBody;
        wallCom.updateComment(post.id, comment.id, comment.newBody,
          // Success
          function() {},
          // Error
          function() {
            forge.logging.error("Error while updating comment");
          }
        );
        return true;
      };
      
      $scope.editPost = function(post) {
        alert("Editing posts is not enabled yet");
        return false;
      };
      
      $scope.deletePost = function(post) {
        alert("Deleting posts is not enabled yet");
        return false;
      };
      
      /**
       * [Called from button] Shows the new message edit box
       */
      $scope.startEditingNewMessage = function() {
        $scope.editNewMessage = true;
        $scope.$$phase || $scope.$apply();
      };
      
      /**
       * [Called from button] Sends the new message
       */
      $scope.sendNewMessage = function() {
        if ($scope.sendingMessage) return;
        if (!forge.is.connection.connected()) {
          alert("You are offline. Please connect to the Internet.");
          return;
        }
        $scope.sendingMessage = true;
        wallCom.sendNewPost($scope.newMessage.body, $scope.coachFilter,
          // Success
          function() {
            $scope.newMessage.body = "";
            $scope.editNewMessage = false;
            $scope.sendingMessage = false;
            $scope.refreshWall();
            $scope.$$phase || $scope.$apply();
          },
          // Error
          function() {
            alert("An error has occurred. Your message was not sent. Please try again.");
            $scope.sendingMessage = false;
            $scope.$$phase || $scope.$apply();
          }
        );
      };
      
      // Initially load single post
      if ($scope.singlePost) {
        $scope.loadSinglePost();
      }
      
      // Tutorial modal
//      userPrefs.onReady(function() {
//        if (!userPrefs.get("tutorial-shown", false)) {
//          // Compute window height needed by modal
//          $scope.modalHeight = $(window).height();
//          // Initialize modal
//          $ionicModal.fromTemplateUrl('tutorial-modal', {
//            scope: $scope,
//            animation: 'slide-in-up'
//          }).then(function(modal) {
//            $scope.modal = modal;
//            $scope.modal.show();
//          });
//          // Cleanup the modal when we're done with it
//          $scope.$on('$destroy', function() {
//            $scope.modal.remove();
//          });
//          $scope.dismissTutorialModal = function() {
//            $scope.modal.hide();
//          };
//          // Disable tutorial for the next times
//          userPrefs.set("tutorial-shown", true);
//        }
//      });
      
    }
  ]);
  
});
