/**
 * This service manages wall/messaging communication with the server
 */
define([
  'app-modules',
  'config/env',
  'services/user-prefs-service',
  'services/login-service',
  'services/image-cache'
], function(appModules, env) {
  
  appModules.services.factory('WallCommunicationService', [
    "UserPrefsService",
    "LoginService",
    "ImageCacheService",
    function(userPrefs, loginService, imageCache) {
      
      // Number of posts fetched by query
      var postCountPerQuery = 100;
      
      // Cached list of posts
      var posts = {
        posts: {},
        persistPosts: function() {
          userPrefs.set("wall." + loginService.getUserId() + ".cache", JSON.stringify(this.posts));
          forge.logging.info("Persisting posts: " + JSON.stringify(this.posts));
        },
        addPost: function(post) {
          this.posts["post" + post.id] = post;
          this.persistPosts();
          // Cache sender image
          if (post.from && post.from.photoURL) {
            imageCache.cacheImage(post.from.photoURL, function(uri) {
              post.from.photoURL = uri;
              posts.persistPosts();
            });
          }
          // Cache comments' sender image
          if (post.comments) {
            forge.logging.info(post.comments.length + " comments for post " + post.id);
            post.comments.forEach(function(comment) {
              forge.logging.info(comment);
              if (comment.from && comment.from.photoURL) {
                forge.logging.info("Caching " + comment.from.photoURL);
                imageCache.cacheImage(comment.from.photoURL, function(uri) {
                  comment.from.photoURL = uri;
                  posts.persistPosts();
                });
              } else forge.logging.info("No from on this comment");
            });
          }
        },
        getPost: function(postId) {
          var post = this.posts["post" + postId];
          if (post) return post;
          return null;
        },
        getPostList: function() {
          var posts = [];
          for (var index in this.posts) {
            posts.push(this.posts[index]);
          }
          return posts;
        },
        clear: function() {
          this.posts = {};
        }
      };
      // Initially load cached list of posts
      userPrefs.onReady(function() {
        var json = userPrefs.get("wall." + loginService.getUserId() + ".cache");
        if (json) {
          posts.posts = JSON.parse(json);
          for (var index in posts.posts) {
            delete posts.posts[index].$$hashKey;
          }
        } else {
          forge.logging.info("No cached wall data");
        }
      });
      
      /**
       * 
       * Get the list of posts for the local user
       * @param {integer} lastKnowPost  Id of the last post we already know
       * @param {function} success      Called with post list on success
       * @param {function} error        Called with error data on error
       */
      function getWallPosts(lastKnownPost, success, error) {
        forge.logging.info("URL: " + loginService.getTargetServer() + "api/v1/posts/all");
        forge.request.ajax({
          type: "GET",
          url: loginService.getTargetServer() + "api/v1/posts/all",
          data: {
            access_token: loginService.getAccessToken(),
            includeComments: true,
            before: lastKnownPost,
            count: postCountPerQuery
          },
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(data, code) {
            forge.logging.info("Post list received");
            forge.logging.info(JSON.stringify(data));
            if (!lastKnownPost) {
              // Refresh list completely
              posts.clear();
            }
            var lastPostId = null;
            data.forEach(function(post) {
              posts.addPost(post);
              lastPostId = post.id;
            });
            forge.logging.info("Posts: " + JSON.stringify(posts.getPostList()));
            success(posts.getPostList(), lastPostId);
          },
          error: function(content) {
            forge.logging.info("Error while fetching post list");
            forge.logging.info(content);
            error(content);
          }
        });
      }
      
      /**
       * Returns the list of posts cached in memory
       */
      function getCachedWallPosts() {
        return posts.getPostList();
      }
      
      /**
       * Get a specific wall post (from memory and from server)
       * 
       * @param {type} postId     Id of the post to load
       * @param {type} preloaded  Called with the post if it is in cache
       * @param {type} success    Called with the post on success
       * @param {type} error      Called with error data on error
       */
      function getWallPost(postId, preloaded, success, error) {
        forge.logging.info("Getting wall post " + postId);
        
        // Retrieve from cache to prepopulate wall post
        selectedPost = posts.getPost(postId);
        if (selectedPost) {
          preloaded(selectedPost);
        }
        
        // Retrive from server
        forge.logging.info(loginService.getTargetServer() + "api/v1/posts/" + postId);
        forge.request.ajax({
          type: "GET",
          url: loginService.getTargetServer() + "api/v1/posts/" + postId,
          data: {
            access_token: loginService.getAccessToken(),
            includeComments: true
          },
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(data, code) {
            forge.logging.info("Post received");
            forge.logging.info(JSON.stringify(data));
            success(data);
          },
          error: function(content) {
            forge.logging.info("Error while fetching post list");
            forge.logging.info(content);
            error(content);
          }
        });
      }
      
      /**
       * Adds a new comment to a post
       */
      function addComment(postId, messageBody, success, error) {
        forge.request.ajax({
          type: "POST",
          url: loginService.getTargetServer() + "api/v1/posts/" + postId + "/comments?access_token=" + loginService.getAccessToken(),
          data: {
            message: messageBody
          },
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(data, code) {
            forge.logging.info("Comment posted");
            forge.logging.info(data);
            success(data);
          },
          error: function(content) {
            forge.logging.info("Error while adding comment");
            forge.logging.info(content);
            error(content);
          }
        });
      }
      
      /**
       * Adds a new comment to a post
       */
      function updateComment(postId, commentId, newMessageBody, success, error) {
        forge.request.ajax({
          type: "PUT",
          url: loginService.getTargetServer() + "api/v1/posts/" + postId + "/comments/" + commentId + "?access_token=" + loginService.getAccessToken(),
          data: {
            message: newMessageBody
          },
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(data, code) {
            forge.logging.info("Comment updated");
            forge.logging.info(data);
            success(data);
          },
          error: function(content) {
            forge.logging.info("Error while updating comment");
            forge.logging.info(content);
            error(content);
          }
        });
      }
      
      /**
       * Deletes an existing comment from a post
       */
      function deleteComment(postId, commentId, success, error) {
        forge.logging.info("Calling " + loginService.getTargetServer() + "api/v1/posts/" + postId + "/comments/" + commentId + "?access_token=" + loginService.getAccessToken());
        forge.request.ajax({
          type: "DELETE",
          url: loginService.getTargetServer() + "api/v1/posts/" + postId + "/comments/" + commentId + "?access_token=" + loginService.getAccessToken(),
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(data, code) {
            forge.logging.info("Comment deleted");
            forge.logging.info(data);
            success(data);
          },
          error: function(content) {
            forge.logging.info("Error while deleting comment");
            forge.logging.info(content);
            error(content);
          }
        });
      }
      
      // Public API
      return {
        getWallPosts: getWallPosts,
        getWallPost: getWallPost,
        getCachedWallPosts: getCachedWallPosts,
        addComment: addComment,
        updateComment: updateComment,
        deleteComment: deleteComment,
        postCountPerQuery: postCountPerQuery
      };
      
    }
  ]);
  
});
