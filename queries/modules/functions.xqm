xquery version "3.0";

module namespace f = 'http://db.hugh.today/functions#';

declare default element namespace "http://vocab.nospoon.tv/ovml#";
declare namespace hvml = "http://vocab.nospoon.tv/ovml#";
declare namespace xlink = "http://www.w3.org/1999/xlink";
declare namespace oembed = "http://oembed.com/";
declare namespace html = "http://www.w3.org/1999/xhtml";
declare namespace mathml = "http://www.w3.org/1998/Math/MathML";
declare namespace svg = "http://www.w3.org/2000/svg";

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

(: https://gist.github.com/holmesw/6936534#file-rfc-822-date-time_002-xqy :)
declare function f:rfc-822-date-time ( $date-time as xs:dateTime ) as xs:string? {
  fn:replace(
    fn:format-dateTime(
      $date-time,
      "[FNn,1-3], [D01] [MNn,1-3] [Y0001] [H01]:[m01]:[s01] [Z01]"
    ),
    "(.{29})(.{1})(.{2})",
    "$1$3"
  )
};
