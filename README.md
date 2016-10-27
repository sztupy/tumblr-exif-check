# Tumblr exif check

EXIF is a way to store metadata inside your image files. This includes things like what camera you used to take the pictures, what creative settings you applied on it, and nowadays it might also contain the location where the image was taken.

As this information might be considered sensitive data (especially if you have taken the picture at home or at work), most social sites, like Facebook, Twitter or Instagram remove these metadata from the uploaded images, so other people who check them will not find them. Tumblr however does no such thing.

## What does this mean?

This means that if you have ever uploaded a picture to tumblr that has GPS information embedded inside, it might expose information about yourself, like where you live and where you work.

## What is this tool?

This tool will go through all of your posts and pictures, downloads them and checks if they have any kind of GPS information in them. Also you can zoom in and select an area on the map, and the tool will tell you the list of posts where that particular location can be found in your pictures. See the Usage section for more information.

## I seem to be affected, what to do next?

Unfortunately due to the nature of Tumblr, neither deleting the posts, nor deleting your blog will make sure that your pictures are gone, as any reblog of your pictures will still contain the original image, with your location in them. The best thing you can do is to send a message to Tumblr's abuse staff telling them that you accidentally exposed confidential information, and ask them to remove all traces of the offending pictures from their site.

Also make sure that you disable location tracking inside your camera, or photo application you are using, so future photos you post will not end up exposing your location. Also spread the word, so maybe Tumblr will eventually fix the problem by removing the GPS data from uploaded pictures both in the future, and retroactively for all, already uploaded images.

## I don't think this is a big issue

Might not be. However I think this is a serious issue because of the following points:

*   Some of Tumblr's userbase can be considered vulnerable. Exposing their home or work location can lead to stalking or real life abuse.
*   Tumblr's API can be used easily to go through pictures to find ones that have location information.
*   Because reblogging will make a copy of your pictures, even if you personally delete/modify your posts/blog, the location data might still be retained.

# Installation

This tool is built using node.js and electron. After installing node.js, run

    npm install
    npm start

To start up the application


# License

Copyright (c) Zsolt Sz. Sztupák <mail@sztupy.hu>

The application is licensed under the AGPL 3.0.

Icon is licensed under the Flaticon Basic Licence. The icon was obtained from http://www.flaticon.com/packs/web-application-ui/2
