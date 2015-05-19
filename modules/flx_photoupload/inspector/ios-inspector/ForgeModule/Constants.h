// Key names for NSUserDefaults standardUserDefaults

// Booleans: whether photos in these orientations must be uploaded
#define DEFAULTS_PHOTO_ORIENTATION_PORTRAIT @"bodytrack_photo_upload_portrait"
#define DEFAULTS_PHOTO_ORIENTATION_UPSIDE_DOWN @"bodytrack_photo_upload_upside_down"
#define DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_LEFT @"bodytrack_photo_upload_landscape_left"
#define DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_RIGHT @"bodytrack_photo_upload_landscape_right"

// Int (timestamp in seconds): only photos after these timestamps will be uploaded (if upload is set for each given orientation)
#define DEFAULTS_PHOTO_ORIENTATION_PORTRAIT_MIN_TIMESTAMP @"bodytrack_photo_upload_portrait_min_timestamp"
#define DEFAULTS_PHOTO_ORIENTATION_UPSIDE_DOWN_MIN_TIMESTAMP @"bodytrack_photo_upload_upside_down_min_timestamp"
#define DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_LEFT_MIN_TIMESTAMP @"bodytrack_photo_upload_landscape_left_min_timestamp"
#define DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_RIGHT_MIN_TIMESTAMP @"bodytrack_photo_upload_landscape_right_min_timestamp"

// String: authentication data and upload url
#define DEFAULTS_USER_ID @"bodytrack_photo_upload_user_id"
#define DEFAULTS_AUTHENTICATION @"bodytrack_photo_upload_authentication"
#define DEFAULTS_UPLOAD_URL @"bodytrack_photo_upload_url"
#define DEFAULTS_ACCESS_TOKEN @"bodytrack_photo_access_token"
#define DEFAULTS_ACCESS_TOKEN_EXPIRATION @"bodytrack_photo_access_token_expiration"
#define DEFAULTS_ACCESS_TOKEN_UPDATE_URL @"bodytrack_photo_access_token_update_url"
#define DEFAULTS_UPLOAD_ON_DATA_CONNECTION @"bodytrack_upload_on_data_connection"

#define THUMBNAIL_SERVER_PORT 9162