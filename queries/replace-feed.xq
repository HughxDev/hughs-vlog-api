import module namespace f = 'http://db.hugh.today/functions#' at 'queries/modules/functions.xqm';

declare default element namespace "http://vocab.nospoon.tv/ovml#";
declare namespace hvml = "http://vocab.nospoon.tv/ovml#";
declare namespace xlink = "http://www.w3.org/1999/xlink";
declare namespace oembed = "http://oembed.com/";
declare namespace html = "http://www.w3.org/1999/xhtml";
declare namespace mathml = "http://www.w3.org/1998/Math/MathML";
declare namespace svg = "http://www.w3.org/2000/svg";

declare boundary-space strip;

declare %updating function f:replaceFeed(
  $feed as element()
) {
  let $vlog := db:open( 'hughs-vlog', 'vlog.hvml' )

  return replace node $vlog/hvml with $feed
};