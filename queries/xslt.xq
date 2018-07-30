import module namespace f = 'http://db.hugh.today/functions#' at 'queries/modules/functions.xqm';

declare default element namespace "http://vocab.nospoon.tv/ovml#";
declare namespace hvml = "http://vocab.nospoon.tv/ovml#";
declare namespace xlink = "http://www.w3.org/1999/xlink";
declare namespace oembed = "http://oembed.com/";
declare namespace html = "http://www.w3.org/1999/xhtml";
declare namespace mathml = "http://www.w3.org/1998/Math/MathML";
declare namespace svg = "http://www.w3.org/2000/svg";
declare namespace output = "http://www.w3.org/2010/xslt-xquery-serialization";
(: declare namespace xslt = "http://www.w3.org/1999/XSL/Transform"; :)

declare option output:omit-xml-declaration "no";

let $in := db:open( 'hughs-vlog', 'vlog.hvml' )
let $style := doc( 'transforms/hvml-to-apple-podcasts-rss.xslt' )
return xslt:transform( $in, $style )
