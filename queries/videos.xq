declare default element namespace "http://vocab.nospoon.tv/ovml#";
declare namespace ovml = "http://vocab.nospoon.tv/ovml#";
declare namespace f = "http://example.com/functions";
declare namespace xlink = "http://www.w3.org/1999/xlink";
declare namespace oembed = "http://oembed.com/";
declare namespace html = "http://www.w3.org/1999/xhtml";
declare namespace mathml = "http://www.w3.org/1998/Math/MathML";
declare namespace svg = "http://www.w3.org/2000/svg";

declare boundary-space strip;

(: http://www.x-query.com/pipermail/talk/2006-January/001062.html :)
declare function f:strip-namespace( $e as element() ) as element() {
  element { QName( (), local-name( $e ) ) } {
    for $child in $e/( @*, *, text() )
    return
      if ( $child instance of element() )
      then f:strip-namespace( $child )
      else $child
  }
};

declare function f:retrieveVideos() {
  let $vlog := db:open( 'hughs-vlog', 'vlog.ovml' )
  
  for $video in $vlog//ovml:video
    return f:strip-namespace( $video )
};

declare function f:getVideos( $wrap as xs:boolean ) {
  if ( $wrap )
  then
    <ovml>{
      f:retrieveVideos()
    }</ovml>
  else
    f:retrieveVideos()
};