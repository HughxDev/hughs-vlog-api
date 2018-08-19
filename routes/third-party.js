var express = require( 'express' );
// var googleapis = require( 'googleapis' );
var router = express.Router();

const google = require( 'googleapis' );
const yt = google.youtube( 'v3' );

const YouTube = require( 'youtube-api' );
const fs = require( 'fs' );
const Logger = require( 'bug-killer' );
const readJson = require( 'r-json' );
const opn = require( 'opn' );
const libxmljs = require( 'libxmljs' );
const marked = require( 'marked' );

const Vimeo = require( 'vimeo' ).Vimeo;
const VIMEO_CREDENTIALS = readJson( `${__dirname}/../vimeo-api/credentials.json` );
const vimeo = new Vimeo( VIMEO_CREDENTIALS.client_id, VIMEO_CREDENTIALS.client_secret, VIMEO_CREDENTIALS.access_token );

const replaceFeed = require( `${__dirname}/videos.js` ).replaceFeed;

const HVMLpath = `${__dirname}/../vlog.hvml`;
const tokensPath = `${__dirname}/../tokens.json`;

const GOOGLE_WEB_CLIENT_CREDENTIALS = readJson( `${__dirname}/../google-apis/web-client.json` );
const GOOGLE_SERVICE_ACCOUNT_CREDENTIALS = readJson( `${__dirname}/../google-apis/service-account.json` );
const GOOGLE_API_KEY = readJson( `${__dirname}/../google-apis/api-key.json` ).key;

const GOOGLE_SIMPLE_AUTH = 0;
const GOOGLE_OAUTH = 1;
const GOOGLE_JWT_AUTH = 2;

const GOOGLE_AUTH_TYPE = GOOGLE_JWT_AUTH;

const YOUTUBE_VIDEOS_CACHE_PATH = 'cache/youtube-videos.json';
const YOUTUBE_WATCH_URL_PREFIX = 'https://www.youtube.com/watch?v=';

const VIMEO_VIDEOS_CACHE_PATH = 'cache/vimeo-videos.json';
const VIMEO_WATCH_URL_PREFIX = 'https://vimeo.com/';
const VIMEO_FLOAT_29_97 = 29.969999999999998863131622783839702606201171875;

const ONE_DAY = 24 * 60 * 60 * 1000;

const namespaces = {
  "hvml": "http://vocab.nospoon.tv/ovml#",
  "xlink": "http://www.w3.org/1999/xlink",
  "oembed": "http://oembed.com/",
  "html": "http://www.w3.org/1999/xhtml"
};

var ytAuth;
// var markedRenderer = new marked.Renderer();

// markedRenderer.paragraph = function(text) {
//   return text + '\n';
// };

switch ( GOOGLE_AUTH_TYPE ) {
  case GOOGLE_SIMPLE_AUTH:
    // new google.auth.???
    ytAuth = YouTube.authenticate( {
      type: "key",
      key: GOOGLE_API_KEY
    } );
  break;

  case GOOGLE_OAUTH:
    // new google.auth.OAuth2(clientId, clientSecret, redirectUri, opt_opts) {}
    ytAuth = YouTube.authenticate( {
      type: "oauth",
      client_id: GOOGLE_WEB_CLIENT_CREDENTIALS.web.client_id,
      client_secret: GOOGLE_WEB_CLIENT_CREDENTIALS.web.client_secret,
      redirect_url: GOOGLE_WEB_CLIENT_CREDENTIALS.web.redirect_uris[0]
    } );
  break;

  case GOOGLE_JWT_AUTH:
    ytAuth = new google.auth.JWT(
      GOOGLE_SERVICE_ACCOUNT_CREDENTIALS.client_email,
      null,
      GOOGLE_SERVICE_ACCOUNT_CREDENTIALS.private_key,
      [ "https://www.googleapis.com/auth/youtube" ],
      null
    );
  break;
}

marked.setOptions({
  "breaks": true
});

function ytAuthorize( callback ) {
  ytAuth.authorize( function ( error, tokens ) {
    if ( error ) {
      Logger.log( 'YouTube authorization error: ', error );

      return;
    }

    // Make an authorized request
    callback();
  });
}

function getVimeoVideos( req, res, callback ) {
  const vimeoProjectId = '434074';

  fs.readFile( VIMEO_VIDEOS_CACHE_PATH, 'utf8', ( error, data ) => {
    if ( !error ) {
      fs.stat( VIMEO_VIDEOS_CACHE_PATH, function ( error, stats ) {
        var now = Date.now();
        var mtime = Date.parse( stats.mtime );
        var cacheAge = now - mtime;
        var size = stats.size;

        if ( ( cacheAge >= ONE_DAY ) || !size || data.trim() === '{}' ) {
          // refresh cache
          vimeo.request( {
            "method": "GET",
            "path": `/me/projects/${vimeoProjectId}/videos`,
            "query": {
              "direction": "asc",
              "sort": "date"
            },
            // An object containing all additional headers (for example, `{"If-Modified-Since": "Mon, 03 Mar 2014 16:29:37 -0500"}`
            // "headers": {}
          }, function ( vimeoError, vimeoVideos, status_code, headers ) {
            res.setHeader( 'Content-Type', 'application/json' );
            // @todo: Over 100(?) results
            fs.writeFile( VIMEO_VIDEOS_CACHE_PATH, JSON.stringify( vimeoVideos ), 'utf8', function () {
              mergeVimeoData( req, res, vimeoVideos, callback );
            } );
          } );
        } else {
          // use cache
          mergeVimeoData( req, res, data, callback );
        }
      } ); // fs.stat
    // readFile error
    } else {
      // The cache path doesn’t exist; attempt to write it, and then retry with same params
      if ( error.code === 'ENOENT' ) {
        fs.writeFile( VIMEO_VIDEOS_CACHE_PATH, '{}', 'utf8', function ( writeError ) {
          if ( writeError ) {
            callback( null, writeError );
          } else {
            getVimeoVideos( req, res, callback );
          }
        } );
      } else {
        callback( null, error );
      }
    }
  } ); // fs.readFile
}

function getYoutubeVideos( req, res, callback ) {
  fs.readFile( YOUTUBE_VIDEOS_CACHE_PATH, 'utf8', ( error, data ) => {
    if ( !error ) {
      fs.stat( YOUTUBE_VIDEOS_CACHE_PATH, function ( error, stats ) {
        // console.log( stats.mtime );
        // res.send( stats );
        var now = Date.now();
        var mtime = Date.parse( stats.mtime );
        var cacheAge = now - mtime;
        var size = stats.size;

        if ( ( cacheAge >= ONE_DAY ) || !size ) {
          // refresh cache
          var playlistItems = yt.playlistItems.list(
            {
              "auth": ytAuth,
              "part": "contentDetails",
              "playlistId": "PLP0y6Eq5YpfQ_1l9JClXpzx7cUyr453Zr",
              "maxResults": 50
            },
            ( playlistItemsError, playlistItems ) => {
              var videoIds = [];

              for ( var i = 0; i < playlistItems.items.length; i++ ) {
                videoIds.push( playlistItems.items[i].contentDetails.videoId );
              }

              var videosListOptions = {
                "auth": ytAuth,
                "part": "contentDetails,fileDetails,id,liveStreamingDetails,localizations,player,processingDetails,recordingDetails,snippet,statistics,status,topicDetails",
                "id": videoIds.join( ',' )
                // "maxResults": 50
              };

              // fileDetails, processingDetails, and suggestions require User Auth
              // "contentDetails": {
              //   "duration": "PT9M51S",
              //   "dimension": "2d",
              //   "definition": "hd",
              //   "caption": "false",
              //   "licensedContent": true,
              //   "projection": "rectangular",
              //   "hasCustomThumbnail": false
              // },
              // "processingDetails": {
              //   "processingStatus": "terminated"
              // },
              if ( GOOGLE_AUTH_TYPE !== GOOGLE_OAUTH ) {
                videosListOptions.part = videosListOptions.part.replace( /(?:fileDetails|processingDetails|suggestions),?/g, '' );
              }

              var videos = yt.videos.list(
                videosListOptions,
                ( videosError, videos ) => {
                  // @todo
                  if ( videosError ) {
                    res.status( 400 ).send( videosError );

                    Logger.log( videosError );
                    return videosError;
                  }

                  // console.log( 'videos', videos );
                  // Logger.log( videos );

                  res.setHeader( 'Content-Type', 'application/json' );

                  // @todo: Over 50 results
                  // if ( 'nextPageToken' in videos ) {
                  // }

                  fs.writeFile( "cache/youtube-videos.json", JSON.stringify( videos ), "utf8", function () {} );

                  // res.send( videos );
                  // res.setHeader( 'Content-Type', 'application/xml' );
                  // res.send(
                    callback( youtubeJSONtoHVML( videos ) );
                  // );
                }
              );
            }
          );
        } else {
          // use cache
          // res.setHeader( 'Content-Type', 'application/json' );
          // res.send( data );

          // res.setHeader( 'Content-Type', 'application/xml' );
          // res.send(
            callback( youtubeJSONtoHVML( data ) );
          // );
        }
      } );
    } else {
      // res.send( error );
      callback( null, error );
    }
  } );
}

function getTokens() {
  opn( oauth.generateAuthUrl( {
    access_type: "offline",
    scope: [ "https://www.googleapis.com/auth/youtube" ]
  } ) );
}

if ( fs.existsSync( tokensPath ) ) {
  var TOKENS = readJson( tokensPath );
}

function tokensExist() {
  return ( fs.existsSync( tokensPath ) && TOKENS && ( 'expiry_date' in TOKENS ) );
}

// function updateXML( res ) {
//   var file = fs.readFile( HVMLpath, 'utf8', function ( error, data ) {
//     // res.send(  data );
//     var hvml = libxmljs.parseXmlString( data );

//     // res.send(
//     var node = hvml.root().find(
//         '//hvml:video[1]',
//         {
//           hvml: 'http://vocab.nospoon.tv/ovml#'
//         }
//       )[0]
//     ;

//     node.addChild( new libxmljs.Element( hvml, 'element-name', 'text' ) );

//     // res.setHeader( 'Content-Type', 'application/hvml+xml' );
//     res.setHeader( 'Content-Type', 'application/xml' );
//     res.send( hvml.toString() );
//   } );
// }

// /youtube-videos/xml
// router.get( '/xml', function ( req, res, next ) {
//   updateXML( res );
// } );

function vimeoJSONtoHVML( vimeoData, hvmlData ) {
  function hasVimeoPermalink( datum ) {
    return ( datum.link && datum.link.match( /https?:\/\/vimeo.com\/hughguiney\/([0-9]{4,}-[0-9]{2}-[0-9]{2})/ ) );
  }

  hvml = libxmljs.parseXmlString( hvmlData );

  if ( ( typeof vimeoData === 'string' ) || ( vimeoData instanceof String ) ) {
    vimeoData = JSON.parse( vimeoData );
  }

  const thumbnailUrlRegex = /\.(jpe?g|png|gif|webp)(\?[^=]+=[^=]+(&[^=]+=[^=]+)*)?$/i;

  for ( let i = 0; i < vimeoData.data.length; ++i ) {
    let vimeoDatum = vimeoData.data[i];
    let hasPermalink = hasVimeoPermalink( vimeoDatum );

    if ( hasPermalink ) {
      let vimeoLink = hasPermalink[0];
      let recordedDate = hasPermalink[1];
      // 2018-08-06T21:44:46+00:00
      let datetime = vimeoDatum.created_time.split( 'T' );
      let video = hvml.get(
        `//hvml:group[@type="series"]/hvml:video[./hvml:recorded[./text() = '${recordedDate}']]`,
        { "hvml": namespaces.hvml }
      );
      // Bizarre syntax… looks like "xmlns" gets replaced with the namespace URI
      let showing = video.find( 'xmlns:showing', namespaces.hvml )[0];

      // `<showing scope="release" type="internet" admission="private" datetime="${datetime[0]}">
      //   <venue type="site" datetime="${datetime[1]}">
      //     <entity site="https://vimeo.com/">Vimeo</entity>
      //     <uri>${vimeoLink}</uri>
      //     <uri>${VIMEO_WATCH_URL_PREFIX + vimeoDatum.pictures.uri.replace( /\/videos\/([0-9]+):([^\/]+)\/pictures\/[0-9]+/, '$1/$2' ) }</uri>
      //     <title>${vimeoDatum.name}</title>
      //   </venue>
      // </showing>`;
      let newShowing = new libxmljs.Element( hvml, 'showing' ).attr( {
        "scope": "release",
        "type": "internet",
        "admission": "private",
        "datetime": datetime[0]
      } );

      let venue = new libxmljs.Element( hvml, 'venue' ).attr( {
        "type": "site",
        "datetime": datetime[1]
      } );

      let entity = new libxmljs.Element( hvml, 'entity', 'Vimeo' ).attr( {
        "site": VIMEO_WATCH_URL_PREFIX
      } );

      let primaryUri = new libxmljs.Element( hvml, 'uri', vimeoLink );

      let secondaryUri = new libxmljs.Element( hvml, 'uri',
        VIMEO_WATCH_URL_PREFIX
        + vimeoDatum.pictures.uri
          .replace( /\/videos\/([0-9]+):([^\/]+)\/pictures\/[0-9]+/, '$1/$2' )
      );

      let title = new libxmljs.Element( hvml, 'title', vimeoDatum.name );

      newShowing.addChild(
        venue
          .addChild( entity )
          .addChild( primaryUri )
          .addChild( secondaryUri )
          .addChild( title )
      );

      showing.addNextSibling( newShowing );

      // console.log( showing.parent().toString() );

      // <presentation>
      //   <poster xml:id="ep-4-poster-webp-720p-vimeo" width="1280" height="720" xlink:href="https://i.vimeocdn.com/video/717920060.webp" />
      //   <frametype abbr="p">progressive</frametype>
      //   <par x="1" y="1" />
      //   <fps rate="30000" scale="1001" />
      //   <file xml:id="ep-4-mp4-720p-vimeo" label="ep-4" xlink:href="https://player.vimeo.com/external/283609122.hd.mp4?s=8ac446cc5958250d6aadc418d56831007653b013&amp;profile_id=174" length="120625532">
      //     <width>1280</width>
      //     <height>720</height>
      //     <container>
      //       <mime>video/mp4</mime>
      //     </container>
      //   </file>
      // </presentation>
      let presentation = video.get(
        'hvml:presentation',
        { "hvml": namespaces.hvml }
      );

      if ( !presentation ) {
        presentation = new libxmljs.Element( hvml, 'presentation' );
      }

      let episodeNumber = video.find( 'xmlns:episode', namespaces.hvml )[0].text();
      let thumbnails = vimeoDatum.pictures.sizes.sort( function sortVimeoThumbnailsDescending( a, b ) {
        return b.height - a.height;
      } );

      for ( let i = 0; i < thumbnails.length; i++ ) {
        let thumbnail = thumbnails[i];
        let thumbnailFormat = thumbnail.link.match( thumbnailUrlRegex );
        let thumbnailFormatMime = `image/${thumbnailFormat[1]}`.replace( /\/jpg$/, '/jpeg' );

        let posterAttributes = {
          "xml:id": `ep-${episodeNumber}-poster-${thumbnailFormat[1]}-${thumbnail.height}p-vimeo`,
          "width": thumbnail.width,
          "height": thumbnail.height,
          "xlink:href": thumbnail.link,
          "mime": thumbnailFormatMime
        };

        let pngPosterAttributes = Object.assign( {}, posterAttributes, {
          "xml:id": posterAttributes['xml:id'].replace( /-jpe?g-/, '-png-' ),
          "xlink:href": posterAttributes['xlink:href'].replace( thumbnailUrlRegex, '.png$2' ),
          "mime": posterAttributes['mime'].replace( /\/jpeg$/, '/png' )
        } );

        let webpPosterAttributes = Object.assign( {}, posterAttributes, {
          "xml:id": posterAttributes['xml:id'].replace( /-jpe?g-/, '-webp-' ),
          "xlink:href": posterAttributes['xlink:href'].replace( thumbnailUrlRegex, '.webp$2' ),
          "mime": posterAttributes['mime'].replace( /\/jpeg$/, '/webp' )
        } );

        let jpegPoster = new libxmljs.Element( hvml, 'poster' ).attr( posterAttributes );
        let pngPoster = new libxmljs.Element( hvml, 'poster' ).attr( pngPosterAttributes );
        let webpPoster = new libxmljs.Element( hvml, 'poster' ).attr( webpPosterAttributes );

        presentation
          .addChild( jpegPoster )
          .addChild( webpPoster )
          .addChild( pngPoster )
        ;
      }

      // Vimeo doesn’t provide the following information so we’re making
      // some assumptions, but they should be safe to make for HD+ in 2018+
      if ( vimeoDatum.height >= 720 ) {
        let frametype = new libxmljs.Element( hvml, 'frametype', 'progressive' ).attr( { "abbr": "p" } );
        let par = new libxmljs.Element( hvml, 'par' ).attr( { "x": "1", "y": "1" } );

        presentation
          .addChild( frametype )
          .addChild( par )
        ;
      }

      let fpsAttributes = {};

      switch ( vimeoDatum.files[0].fps ) {
        case VIMEO_FLOAT_29_97:
          fpsAttributes.rate = "30000";
          fpsAttributes.scale = "1001";
        break;

        default:
          fpsAttributes.rate = ( vimeoDatum.files[0].fps * 1000 ).toString();
          fpsAttributes.scale = "1000";
      }

      let fps = new libxmljs.Element( hvml, 'fps' ).attr( fpsAttributes );

      presentation
        .addChild( fps )
      ;

      //   <file xml:id="ep-4-mp4-720p-vimeo" label="ep-4" xlink:href="https://player.vimeo.com/external/283609122.hd.mp4?s=8ac446cc5958250d6aadc418d56831007653b013&amp;profile_id=174" length="120625532">
      //     <width>1280</width>
      //     <height>720</height>
      //     <container>
      //       <mime>video/mp4</mime>
      //     </container>
      //   </file>

      for ( let i = 0; i < vimeoDatum.files.length; ++i ) {
        let fileData = vimeoDatum.files[i];
        let shorthandMime = fileData.type.replace( 'video/', '' );

        let file = new libxmljs.Element( hvml, 'file' ).attr( {
          "xml:id": `ep-${episodeNumber}-${shorthandMime}-${fileData.height ? ( fileData.height + 'p' ) : fileData.quality}-vimeo`,
          "label": `ep-${episodeNumber}`,
          "xlink:href": fileData.link,
          "length": fileData.size
        } );

        if ( fileData.width ) {
          let width = new libxmljs.Element( hvml, 'width', fileData.width.toString() );
          file.addChild( width );
        }

        if ( fileData.height ) {
          let height = new libxmljs.Element( hvml, 'height', fileData.height.toString() );
          file.addChild( height );
        }

        let container = new libxmljs.Element( hvml, 'container' );
        let mime = new libxmljs.Element( hvml, 'mime', fileData.type );

        presentation.addChild(
          file
            .addChild(
              container.addChild( mime )
            )
        );
      }

      newShowing.addNextSibling( presentation );

      // console.log( newShowing.parent().toString() );
    }
  } // for vimeoData

  return hvml.toString();
}

function youtubeJSONtoHVML( json ) {
  /*
    for each item:
      <video type="personal" xml:lang="XX" xml:id="ep-XXX">
        ✔︎ snippet.defaultAudioLanguage → @xml:lang
        ✔ snippet.title → <title>
        ✔ snippet.description → <description type="xhtml"><div xmlns>
          snippet.tags → <tags><tag>
          snippet.thumbnails → <presentation><poster /></presentation>
        ✔ contentDetails.duration → <runtime>
        ✔ id → <showing scope="release" type="internet" admission="public">
                 <uri>https://www.youtube.com/watch?v=XXXX</uri>
        ✔ recordingDetails ?
            .recordingDate → <recorded>
  */
  // console.log( json );
  if ( ( typeof json === 'string' ) || ( json instanceof String ) ) {
    json = JSON.parse( json );
  }

  function getRecordingDate( item ) {
    // check if metadata version exists
    if ( ( 'recordingDetails' in item ) && ( 'recordingDate' in item.recordingDetails ) ) {
      return item.recordingDetails.recordingDate.replace( 'T00:00:00.000Z', '' );
    }

    // if not check if text version exists
    if ( ( 'snippet' in item ) && ( 'description' in item.snippet ) ) {
      var regex = /Recorded:\s+([0-9]{4,}-[0-9]{2}-[0-9]{2})/gi;
      var matches = regex.exec( item.snippet.description );

      if ( matches ) {
        return matches[1];
      }
    }

    return null;
  }

  function getEpisodeCatalogParts( item ) {
    var regex;
    var matches;

    if ( 'snippet' in item ) {
      // New episodes:
      if ( 'description' in item.snippet ) {
        /*
          $0: Episode: S02E01 (#9)
          $1: S02E01
          $2: 02
          $3: 01
          $4: 9
        */
        regex = /Episode:\s+(S([0-9]{2,})(?:\s+)?E([0-9]{2,}))\s+\(#([0-9]+)\)/gi;
        matches = regex.exec( item.snippet.description );

        if ( matches ) {
          return matches;
        }
      }
    }

    return null;
  }

  function getEpisodeNumber( item ) {
    var regex;
    var matches;

    // New episodes:
    var catalogParts = getEpisodeCatalogParts( item );

    if ( catalogParts ) {
      return catalogParts[4];
    }

    if ( 'snippet' in item ) {
      // Old episodes:
      if ( 'title' in item.snippet ) {
        regex = /Episode\s+#([0-9]+)/gi;
        matches = regex.exec( item.snippet.title );

        if ( matches ) {
          return matches[1];
        }
      }
    }

    return null;
  }

  function getSeasonNumber( item, episodeNumber ) {
    var catalogParts = getEpisodeCatalogParts( item );
    var seasonOneUpperLimit = 8;

    if ( catalogParts ) {
      return catalogParts[2];
    }

    episodeNumber = parseInt( episodeNumber || getEpisodeNumber(), 10 );

    if ( episodeNumber <= seasonOneUpperLimit ) {
      return '01';
    }

    return null;
  }

  function getCanonicalTitle( title ) {
    var extraneousTitlingRegex = /(?:\s+[-|]\s+)?(?:(?:Hugh['’‘]s\s+(?:\[?Startup\]?\s+)?Vlog(?:\s+Episode\s+#[0-9]+(?:\s+-\s+|:\s+))?)|\s+.\s+#.+)/gi;

    var cleanTitle = title.replace( extraneousTitlingRegex, '' ).replace( /['‘’"“”](.+)['‘’"“”]/g, '$1' );

    return cleanTitle;
  }

  function getCanonicalDescription( description ) {
    // Logger.log(
    var cleanDescription =
      description.split( '\n\n' )
        .filter(function ( text ) {
          return text.indexOf( 'Watch on Facebook: ' ) === -1;
        } )
        .filter(function ( text ) {
          return text.indexOf( 'Follow Me\n' ) === -1;
        } )
        .filter(function ( text ) {
          return text.indexOf( 'Episode: ' ) === -1;
        } )
        .filter(function ( text ) {
          return text.indexOf( 'Referenced Works' ) === -1;
        } )
        .filter(function ( text ) {
          return text.indexOf( 'License: ' ) === -1;
        } )
        .filter(function ( text ) {
          return text.indexOf( 'via SoundCloud: ' ) === -1;
        } )
        .filter(function ( text ) {
          return text.indexOf( 'Follow me on ' ) === -1;
        } )
        .filter(function ( text ) {
          return ( text.replace( /(#[^\s]+)/g, '' ).trim() !== '' );
        } )
        .join( '\n\n' )
    ;

    // Logger.log( cleanDescription );

    return cleanDescription;
    // );
  }

  var defaultLanguage = 'en-US';

  var hvml = libxmljs.parseXml(
    `<?xml version="1.0" encoding="UTF-8"?>
    <hvml
      xmlns="http://vocab.nospoon.tv/ovml#"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      xmlns:oembed="http://oembed.com/"
      xmlns:html="http://www.w3.org/1999/xhtml"
      xml:lang="${defaultLanguage}"
    >
      <group xml:id="hughs-vlog" type="series">
        <title>Hugh’s Vlog</title>
        <description type="xhtml">
          <div xmlns="http://www.w3.org/1999/xhtml">
            <p>Hi, I’m Hugh. I started this video blog to document what it’s like to build a company, day by day, from the very beginning. I want to take this typically very private process and open it up to everyone. Imagine if you were able to watch Steve Jobs and Wozniak grow Apple from a garage project into the largest tech company in the world? I may not reach that level of success; I may fail spectacularly, but at least there will be a record of the attempt.</p>
            <p>For me, it’s self-improvement by way of radical transparency, and the public accountability that comes with that. For you: you get to my virtual co-founders. I’ll be listening to your feedback in the comments and chat room every step of the way. I also endeavor to make the series equal parts informative and entertaining—so whether you’re a fellow founder looking to compare notes, or just an Average Joe/Josephine killing time on your lunch break, there’s something in it for you.</p>
            <p>Join me as I attempt to achieve financial independence, put a dent in the universe, and squeeze the most I can out of life along the way.</p>
          </div>
        </description>
        <tagline>The daily life of a startup founder, programmer, and filmmaker.</tagline>
        <producer>
          <entity>
            <name>
              <family-name>Guiney</family-name>
              <given-name>Hugh</given-name>
            </name>
            <uri>https://hugh.today</uri>
            <email>hello@hugh.today</email>
          </entity>
        </producer>
        <copyright>
          <text>© 2016–2018 Hugh Guiney</text>
        </copyright>
        <!-- <group xml:id="season-x" type="series"></group> -->
      </group>
    </hvml>`
  );

  // var seasonX = hvml.find( '//hvml:group[@xml:id="season-x"]', namespaces )[0];
  var hughsVlog = hvml.find( '//hvml:group[@xml:id="hughs-vlog"]', namespaces )[0];

  var
    canonicalDescription,
    contentDetails,
    currentItem,
    episode,
    episodeNumber,
    description,
    descriptionDiv,
    poster,
    posterMaxres,
    presentation,
    published,
    publishedParts,
    publishedDay,
    publishedTime,
    recorded,
    recordingDate,
    runtime,
    showing,
    snippet,
    seasonGroup,
    seasonNumber,
    season,
    venue,
    venueEntity,
    video,
    youtubeDescription
  ;

  for (var i = 0; i < json.items.length; i++) {
    currentItem = json.items[i];
    snippet = currentItem.snippet;
    contentDetails = currentItem.contentDetails;
    episodeNumber = getEpisodeNumber( currentItem );

    // <video>
    video = new libxmljs.Element( hvml, 'video' );
    video.attr({
      "type": "personal",
      "xml:id": "ep-" + episodeNumber
    });

    if (
      'defaultAudioLanguage' in currentItem.snippet
      && currentItem.snippet.defaultAudioLanguage !== defaultLanguage
    ) {
      video.attr({
        "xml:lang": currentItem.snippet.defaultAudioLanguage
      });
    }

    // <title>
    video.addChild( new libxmljs.Element( hvml, 'title', getCanonicalTitle( snippet.title ) ) );

    // <episode>
    episode = new libxmljs.Element( hvml, 'episode', episodeNumber );
    video.addChild( episode );

    // <runtime>
    runtime = new libxmljs.Element( hvml, 'runtime', contentDetails.duration );

    video.addChild( runtime );

    // <recorded>
    recordingDate = getRecordingDate( currentItem );

    if ( recordingDate ) {
      recorded = new libxmljs.Element( hvml, 'recorded', recordingDate );

      video.addChild( recorded );
    }

    // <published>
    published = new libxmljs.Element( hvml, 'published', snippet.publishedAt );

    publishedParts = snippet.publishedAt.split( 'T' );

    publishedDay = publishedParts[0];
    publishedTime = publishedParts[1];

    video.addChild( published );

    // <description>
    canonicalDescription = getCanonicalDescription( snippet.description );

    if ( canonicalDescription.trim() !== '' ) {
      description = new libxmljs.Element( hvml, 'description' ).attr({ "type": "xhtml" });

      description.addChild(
        libxmljs.parseHtmlFragment(
          // marked( snippet.description.trim() )
          '<div>' + marked( canonicalDescription ) + '</div>'
          // markedRenderer( snippet.description )
          // marked.inlineLexer( snippet.description, [] )
        ).root().namespace( namespaces.html )
      );

      video.addChild( description );
    }

    // <showing scope="release" type="internet" admission="public">
    showing = new libxmljs.Element( hvml, 'showing' );
    showing.attr({
      "scope": "release",
      "type": "internet",
      "admission": "public",
      "datetime": publishedDay
    });

    /*
      <showing scope="release" type="internet" admission="public" datetime="2017-09-14">
        <venue type="site">
          <entity site="http://hugh.today/">hugh.today</entity>
          <uri>http://hugh.today/2017-09-14</uri>
        </venue>
        <venue type="site">
          <entity site="https://www.youtube.com/">YouTube</name>
          <uri>https://www.youtube.com/watch?v=aEmmNJHzjTw</uri>
        </venue>
        <venue type="site">
          <entity site="https://www.facebook.com/">Facebook</entity>
          <uri>https://www.facebook.com/HughsVlog/videos/1928756370692126/</uri>
        </venue>
      </showing>
    */

    venue = new libxmljs.Element( hvml, 'venue' );
    venue.attr({
      "type": "site",
      "datetime": publishedTime
    });

    venueEntity = new libxmljs.Element( hvml, 'entity', 'YouTube' );
    venueEntity.attr({
      "site": "https://www.youtube.com/"
    });

    venue.addChild( venueEntity );
    venue.addChild( new libxmljs.Element( hvml, 'uri', YOUTUBE_WATCH_URL_PREFIX + currentItem.id ) );
    venue.addChild( new libxmljs.Element( hvml, 'title', snippet.title ) );

    if ( snippet.description.trim() !== '' ) {
      youtubeDescription = new libxmljs.Element( hvml, 'description' );
      youtubeDescription.attr({
        "type": "xhtml"
      });

      // descriptionDiv = new libxmljs.Element( hvml, 'div' ).namespace( namespaces.html );
      youtubeDescription.addChild(
        libxmljs.parseHtmlFragment(
          // marked( snippet.description.trim() )
          '<div>' + marked( snippet.description ) + '</div>'
          // markedRenderer( snippet.description )
          // marked.inlineLexer( snippet.description, [] )
        ).root().namespace( namespaces.html )
      );

      venue.addChild( youtubeDescription );
    }

    showing.addChild( venue );

    video.addChild( showing );

    // <presentation>
    if ( 'thumbnails' in currentItem.snippet ) {
      presentation = new libxmljs.Element( hvml, 'presentation' );

      /*
        <poster
          xml:id="ep-0-poster-webp-720p-vimeo"
          width="1280"
          height="720"
          xlink:href="https://i.vimeocdn.com/video/717859251.webp"
          mime="image/webp"
        />
      */
      /*
        "maxres": {
          "url": "https://i.ytimg.com/vi/o5MaYhQZONY/maxresdefault.jpg",
          "width": 1280,
          "height": 720
        }
      */
      // posterMaxres = currentItem.snippet.thumbnails.maxres;
      // @todo: all thumbnails
      let sortedThumbnails = Object.keys( currentItem.snippet.thumbnails ).sort( function ( a, b ) {
        return ( currentItem.snippet.thumbnails[b].height - currentItem.snippet.thumbnails[a].height );
      } );

      sortedThumbnails.forEach( function ( size ) {
        poster = new libxmljs.Element( hvml, 'poster' );
        thumbnail = currentItem.snippet.thumbnails[size];

        // thumbnail.url;
        poster.attr( {
          "xml:id": `ep-${episodeNumber}-poster-jpg-${thumbnail.height}p-youtube`,
          "width": thumbnail.width,
          "height": thumbnail.height,
          "xlink:href": thumbnail.url,
          "mime": "image/jpeg"
        } );

        presentation.addChild( poster );
      } );

      video.addChild( presentation );
    } // thumbnails

    // Call last
    // seasonX.addChild( video );
    seasonNumber = getSeasonNumber( currentItem, episodeNumber );

    if ( seasonNumber ) {
      seasonGroup = hvml.find( '//group[@xml:id="season-' + seasonNumber + '"]', namespaces );

      // Logger.log( seasonGroup );

      if ( seasonGroup && seasonGroup.length ) {
        seasonGroup[0].addChild( video );
      } else {
        season = new libxmljs.Element( hvml, 'group' );
        season.attr({
          "xml:id": "season-" + seasonNumber,
          "type": "series"
        });

        season.addChild( new libxmljs.Element( hvml, 'title', 'Season ' + parseInt( seasonNumber, 10 ) ) );

        season.addChild( video );

        hughsVlog.addChild( season );
      }
    }
  }

  return hvml.toString();
} // youtubeJSONtoHVML

// /third-party
router.get( '/youtube', function ( req, res, next ) {
  if ( GOOGLE_AUTH_TYPE === GOOGLE_OAUTH ) {
    if ( tokensExist() ) {
      if ( ( new Date() ) < ( new Date( TOKENS.expiry_date ) ) ) {
        oauth.setCredentials( TOKENS );

        Logger.log( 'Using saved tokens.' );

        // @todo setHeader
        getYoutubeVideos(req, res, function ( data, error ) {
          if ( !error ) {
            res.setHeader( 'Content-Type', 'application/xml' );
            res.send( data );
          } else {
            res.status( 500 ).send( error );
          }
        });
        // next();
      } else {
        Logger.log( 'Saved tokens are expired; refreshing...' );

        getTokens();
      }
    } else {
      Logger.log( 'No saved tokens; obtaining...' );

      getTokens();
    }
  } else {
    ytAuthorize( function () {
      // @todo setHeader
      getYoutubeVideos(req, res, function ( data, error ) {
        if ( !error ) {
          res.setHeader( 'Content-Type', 'application/xml' );
          res.send( data );
        } else {
          res.status( 500 ).send( error );
        }
      });
    } );
  }
} );

// ⚠️ Destructive
router.put( '/youtube/sync', function ( req, res, next ) {
  getYoutubeVideos( req, res, function ( data, error ) {
    if ( !error ) {
      // res.send( data );
      replaceFeed( data, req, res );
    } else {
      res.status( 500 ).send( error );
    }
  } );
} );

function mergeVimeoData( req, res, vimeoData, callback ) {
  // console.log( 'vimeoData', vimeoData );
  getYoutubeVideos( req, res, function ( hvmlData, error ) {
    if ( !error ) {
      callback( vimeoJSONtoHVML( vimeoData, hvmlData ) );
    } // if !error
    else {
      callback( null, error );
    }
  } ); // getYoutubeVideos
}

router.get( '/vimeo', function ( req, res, next ) {
  getVimeoVideos( req, res, function ( data, error ) {
    if ( error ) {
      res.status( 500 ).send( error );
      return error;
    }

    res.setHeader( 'Content-Type', 'application/json' );
    res.send( data );
  } );
} );

router.put( '/vimeo/sync', function ( req, res, next ) {
  getVimeoVideos( req, res, function ( data, error ) {
    if ( !error ) {
      // res.send( data );
      replaceFeed( data, req, res );
    } else {
      res.status( 500 ).send( error );
    }
  } );
} );

// router.put( '/sync', function ( req, res, next ) {} );

// /third-party/oauth2callback
router.get( '/oauth2callback', function ( req, res, next ) {
  oauth.getToken( req.query.code, ( error, tokens ) => {
    Logger.log( 'Trying to get the token using the following code: ' + req.query.code );

    if ( error ) {
      res.status( 400 ).send( error );

      return Logger.log( error );
    }

    Logger.log( 'Got the tokens.' );

    oauth.setCredentials( tokens );

    fs.writeFile( "google-apis/tokens.json", JSON.stringify( tokens ), "utf8", function () {
      Logger.log( 'Tokens written to file.' );
    } );

    // res.end();

    // User ID: GPCcxdykgp6hgvL0XE3yaA
    // Channel ID: UCGPCcxdykgp6hgvL0XE3yaA
    // Playlist ID - Entire Series: PLP0y6Eq5YpfQ_1l9JClXpzx7cUyr453Zr

    getYoutubeVideos(req, res, function ( data, error ) {
      if ( !error ) {
        res.setHeader( 'Content-Type', 'application/xml' );
        res.send( data );
      } else {
        res.status( 500 ).send( error );
      }
    });
  } );
} );

module.exports = router;
