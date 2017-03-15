import module namespace f = 'http://db.hugh.today/functions#' at 'Sites/hughs-vlog-api/queries/modules/functions.xqm';

declare default element namespace "http://vocab.nospoon.tv/ovml#";
declare namespace ovml = "http://vocab.nospoon.tv/ovml#";
declare namespace xlink = "http://www.w3.org/1999/xlink";
declare namespace oembed = "http://oembed.com/";
declare namespace html = "http://www.w3.org/1999/xhtml";
declare namespace mathml = "http://www.w3.org/1998/Math/MathML";
declare namespace svg = "http://www.w3.org/2000/svg";

declare boundary-space strip;

declare function f:findVideosByTitle( $title as xs:string ) {
  let $vlog := db:open( 'hughs-vlog', 'vlog.ovml' )
  
  for $video in $vlog//ovml:video[ovml:title[text() contains text { $title } any word]]
    return <ovml>{ f:strip-namespace( $video ) }</ovml>
};