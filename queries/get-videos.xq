import module namespace f = 'http://db.hugh.today/functions#' at 'Sites/hughs-vlog-api/queries/modules/functions.xqm';

declare default element namespace "http://vocab.nospoon.tv/ovml#";
declare namespace ovml = "http://vocab.nospoon.tv/ovml#";
declare namespace xlink = "http://www.w3.org/1999/xlink";
declare namespace oembed = "http://oembed.com/";
declare namespace html = "http://www.w3.org/1999/xhtml";
declare namespace mathml = "http://www.w3.org/1998/Math/MathML";
declare namespace svg = "http://www.w3.org/2000/svg";

declare boundary-space strip;

declare function f:retrieveVideos( $limit as xs:integer? ) {
  let $vlog := db:open( 'hughs-vlog', 'vlog.ovml' )

  return
    if ( fn:exists( $limit ) )
    then
      for $video in subsequence( reverse( $vlog//ovml:video ), 1, $limit )
        return f:strip-namespace( $video )
    else
      for $video in reverse( $vlog//ovml:video )
        return f:strip-namespace( $video )
};

declare function f:getVideos( $wrap as xs:boolean, $limit as xs:integer? ) {
  if ( $wrap )
  then
    <ovml>{
      f:retrieveVideos( $limit )
    }</ovml>
  else
    f:retrieveVideos( $limit )
};