/*
 * Knight's Tour, the original version (2015).
 *
 * Written by Joel E. Mason for freethecube.com, later hosted at blog.joelemason.com/kt.
 * Plain JavaScript on jQuery, underscore and Bootstrap, for an 8 x 8 board. It is kept here
 * as it was, apart from this comment, for anyone curious where the current game started.
 * The modern version (React and TypeScript, in ../../src) was rebuilt from it in 2026 with
 * help from Claude Opus and Claude Sonnet (Anthropic).
 *
 * Copyright 2015-2026 Joel E. Mason
 * Licensed under the Apache License, Version 2.0. See ../../LICENSE.
 */

/* global parseInt, _ */

//© Freethecube.com Joel E. Mason 2015

var filepath = "https://" + $(location).attr('hostname') + "/kt/";
var color = $(".tdcls").css('backgroundColor');
var possiblemove = [];
var moves = [];
var backmove = [];
var previousmove = -1;
var possiblemoves = 64;
var winorlose = false;
var nummoves = 0;
var hintsonoff = false;
var indexcoords = GetCoords();
var coordsindex = GetIndexs();
var boardmovesarray = GetBoardMovesArray();

ResetBoard();

$(document).ready(function()
{
    $(window).resize(function()
    {
        if ($(window).width() <= 700 || $(window).height() <= 800)
        {
            var vals = $('.footerinfo').html().split(",");
            var sclw = ((parseFloat($(window).width()) - vals[0]) / parseFloat($(".gametable").width())).toString();
            var sclh = ((parseFloat($(window).height()) - vals[1]) / parseFloat($(".gametable").width())).toString();
            var sc = parseFloat(sclw) < parseFloat(sclh) ? sclw : sclh;
            
            $('.gametable').css({'-webkit-transform':'scale(' + sc + ')','-moz-transform':'scale(' + sc + ')','-ms-transform':'scale(' + sc + ')','-o-transform':'scale(' + sc + ')','transform':'scale(' + sc + ')','transform-origin':'top left'});
            $(".infobox").width(parseInt($(".gametable").width() * sc));
        }
        else
        {
            $('.gametable').css({'-webkit-transform':'scale(1)','-moz-transform':'scale(1)','-ms-transform':'scale(1)','-o-transform':'scale(1)','transform':'scale(1)','transform-origin':'top left'});
            $(".infobox").width(parseInt($(".gametable").width()));
        }
    }).resize();
});

$(".hintsonoff").click(function()
{
    hintsonoff = !hintsonoff;
    if (hintsonoff)
        $(".infotdfuture").removeClass("invisible");
    else
        $(".infotdfuture").addClass("invisible");
});

$(".automagically").click(function(){ AutoMagically(); });

$(".resetboard").click(function(){ ResetBoard(); });

$(".backmove").click(function(){ BackMove(); });

$(".tdcls").click(function()
{
    if (winorlose) return;
    if (possiblemove[$(this).attr("id")])
    {
        if (nummoves > 63)
            ResetBoard();
        Move($(this).attr("id"));
    }
    else
        BadMove(this);
});

$(".tdcls").hover(function()
{
    if (winorlose) return;
    UpdateInfoBox($(this).attr("id"));
    $(".infobox").css({'visibility': 'visible'});
    $(this).css({'backgroundColor': possiblemove[$(this).attr("id")] ? '#800080' : 'red'});
    if ((possiblemove[$(this).attr("id")] || $(this).attr("id") === previousmove) && hintsonoff)
        FindFutureMoves($(this).attr("id"));
}, 
function()
{
    if (winorlose) return;
    if (previousmove === $(this).attr("id"))
        $(this).css({'backgroundColor': '#1e73be'});
    else
        $(this).css({'backgroundColor': color});
    
    $(".infobox").html("<p>text</p><p>text</p>");
    $(".infobox").css({'visibility': 'hidden'});
    if (hintsonoff) FindFutureMoves(99);
});

function Move(index)
{
    if (previousmove !== -1 || !winorlose)
    {
        $("#" + previousmove).css({'backgroundColor': color});
        $("#" + previousmove).find(".playpiece").first().prop("src", filepath + "pics/PreviousKnight.png");
        $("#" + previousmove).find(".playpiece").first().css({'opacity': '0.6'});
    }
    
    $("#" + index).css({'backgroundColor': '#1e73be'});    
    $("#" + index).find(".playpiece").first().prop("src", filepath + "pics/Knight.png");
    previousmove = $("#" + index).attr("id");
    moves[previousmove] = true;
    nummoves++;
    backmove.push(parseInt(previousmove));    
    FindPossibleMoves(previousmove);
    UpdateInfoBox(previousmove);    
    var hasorphans = HasOrphans();
    if (possiblemoves === 0 || nummoves === 64 || hasorphans !== -1)
        WinOrLose(hasorphans);
}

function HasOrphans()
{
    for (var x = 0; x < 64; x++)
        if (!moves[x])
        {
            var poc = 0;            
            for (var y = 0; y < boardmovesarray[x].length; y++)
                if (moves[parseInt(boardmovesarray[x][y])] && parseInt(boardmovesarray[x][y]) !== parseInt(previousmove))
                    poc++;
            
            if (poc === boardmovesarray[x].length) return x;
        }
    return -1;
}

function BackMove()
{
    var lastmove = backmove[backmove.length - 1];    
    $("#" + lastmove).css({'backgroundColor': color});
    $("#" + lastmove).find(".playpiece").first().prop("src", filepath + "pics/KnightClear.png");
    $("#" + lastmove).find(".playpiece").first().css({'opacity': '1'});
    moves[$("#" + lastmove).attr("id")] = false;    
    lastmove = backmove[backmove.length - 2];    
    $("#" + lastmove).css({'backgroundColor': "#1e73be"});    
    $("#" + lastmove).find(".playpiece").first().prop("src", filepath + "pics/Knight.png");
    $("#" + lastmove).find(".playpiece").first().css({'opacity': '1'});
    previousmove = $("#" + lastmove).attr("id");
    moves[$("#" + lastmove).attr("id")] = true;
    nummoves--;
    backmove.pop();
    winorlose = false;
    
    if (nummoves === 0) 
        ResetBoard();
    else
    {
        FindPossibleMoves($("#" + lastmove).attr("id"));
        UpdateInfoBox($("#" + lastmove).attr("id"));
    }
    
    $(".infobox").css({'backgroundColor': color});
}

function WinOrLose(hasorphans)
{
    winorlose = true;
    if (nummoves === 64)
    {
        $(".infobox").css({'backgroundColor': '#1e73be'});
        $(".infobox").html("<p>Congratulations!</p><p>You Win!&nbsp;&nbsp;&nbsp;<img id=\"smilesmallpic\" src=\"" + filepath + 
                "pics/smilesmall.png\" alt=\"SmileSmall\">&nbsp;&nbsp;&nbsp;</p>");
    }
    else if (possiblemoves === 0)
    {
        $(".infobox").css({'backgroundColor': 'red'});
        $(".infobox").html("<p>I'm sorry to say, but ...</p><p>You Lose!&nbsp;&nbsp;&nbsp;<img id=\"frownsmallpic\" src=\"" + filepath + 
                "pics/frownsmall.png\" alt=\"FrownSmall\">&nbsp;&nbsp;&nbsp;Move count: " + nummoves + "</p>");
    }
    else
    {
        $(".infobox").css({'backgroundColor': 'red'});
        $(".infobox").html("<p>I'm sorry to say, but you lose!</p><p>You made an Orphan of " + indexcoords[hasorphans] + "!&nbsp;&nbsp;&nbsp;<img id=\"frownsmallpic\" src=\"" + filepath + 
                "pics/frownsmall.png\" alt=\"FrownSmall\">&nbsp;&nbsp;&nbsp;Move count: " + nummoves + "</p>");
    }
}

function ResetBoard()
{
    previousmove = -1;
    possiblemoves = 64;
    winorlose = false;
    nummoves = 0;    
    backmove = [];

    for (var c = 0; c < 64; c++)
    {
        possiblemove[c] = true;
        moves[c] = false;
        $("#" + c).css({'backgroundColor': color});
    }
    
    $(".playpiece").prop("src", filepath + "pics/KnightClear.png");
    $(".playpiece").css({'opacity': '1'});    
    $(".infobox").html("<p>text</p><p>text</p>");
    $(".infobox").css({'visibility': 'hidden'});
    $(".infobox").css({'backgroundColor': color});    
    $(".futuretooltip").hide();
    $(".futuretooltip").html("");
    $(".log").html("");
}

function UpdateInfoBox(x)
{
    $(".infobox").html("<p>Location: " + "<span style=\"color: " + (possiblemove[x] ? "#00FF00" : "red") + 
            "\">" + indexcoords[x] + "</span></p>" + "<p><span>Possible moves: " + possiblemoves + 
            "</span>&nbsp;&nbsp;&nbsp;<span>Move count: " + nummoves + "</span></p>");
}

function FindPossibleMoves(index)
{
    var i = boardmovesarray[index];    
    possiblemoves = 0;
    
    for (var c = 0; c < 64; c++)
    {
        possiblemove[c] = false;
        if ($.inArray(c, i) !== -1 && !moves[c])
        {
            possiblemove[c] = true;
            possiblemoves++;
        }
    }
}

function FindFutureMoves(index)
{
    if (index === 99)
        for (var c = 0; c < 64; c++)
        {
            if (previousmove === c)
                $("#" + c).css({'backgroundColor': '#1e73be'});
            else
                $("#" + c).css({'backgroundColor': color});
            $(".futuretooltip").hide();
            $(".futuretooltip").html("");
        }
    else
    {
        var i = boardmovesarray[index];        
        var j = {};

        for (var x = 0; x < i.length; x++)
        {
            var k = boardmovesarray[i[x]];
            var st = 0;
            for (var t = 0; t < k.length; t++)
            if (!moves[k[t]] && k[t] !== parseInt(index) && k[t] !== i[x])
                        st++;
            j[i[x]] = [x, i[x], st];
        }

        for (var c = 0; c < 64; c++)
            if ($.inArray(c, i) !== -1 && !moves[c] && c !== index)
            {
                $("#" + c).css({'backgroundColor': '#00FF00'});

                if (j[c] !== null)
                {
                    t = j[c];
                    var p = $("." + t[1]).position();

                    $(".ft" + t[0]).html(t[2]);
                    $(".ft" + t[0]).parent().css({position: 'relative'});
                    $(".ft" + t[0]).css({top: p.top, left: p.left, position: 'absolute'});
                    $(".ft" + t[0]).show();
                }
            }
    }
}

function FindMoves(index)
{
    var yx = indexcoords[index];
    var i = [];
    
    function PossibleMove(y, x)
    {
        if ((1 <= y && y <= 8) && (1 <= x && x <= 8))
            i.push(coordsindex[y - 1][x - 1]);
    }
    
    PossibleMove(yx[0] - 2, yx[1] + 1);
    PossibleMove(yx[0] - 2, yx[1] - 1);
    PossibleMove(yx[0] + 2, yx[1] + 1);
    PossibleMove(yx[0] + 2, yx[1] - 1);
    PossibleMove(yx[0] + 1, yx[1] + 2);
    PossibleMove(yx[0] - 1, yx[1] + 2);
    PossibleMove(yx[0] + 1, yx[1] - 2);
    PossibleMove(yx[0] - 1, yx[1] - 2);
    
    return i;
}

function BadMove(square)
{
    for (var x = 0; x < 8; x++)
        if (x % 2 === 0)
            $(square).animate({'backgroundColor': color}, 50);
        else
            $(square).animate({'backgroundColor': 'red'}, 50);
    
    if ($(square).is(":hover"))
        $(square).animate({'backgroundColor': 'red'}, 50);
    else
        $(square).animate({'backgroundColor': color}, 50);
}

function GetCoords()
{
    var c = 0;
    var ic = [64];
    
    for (var i = 1; i < 9; i++)
        for (var j = 1; j < 9; j++)
            ic[c++] = [i, j];
    
    return ic;
}

function GetIndexs()
{
    var ci = [];
    var c = 0;
    
    for (var y = 0; y < 8; y++)
    {
        ci[y] = [];
        for (var x = 0; x < 8; x++)
            ci[y][x] = c++;
    }
    
    return ci;
}

function GetBoardMovesArray()
{
    var px = [];
    
    for (var x = 0; x < 64; x++)
        px[x] = FindMoves(x);
    
    return px;
}

function AutoMove(index)
{
    if (previousmove !== -1 || !winorlose)
    {
        $("#" + previousmove).css({'backgroundColor': color});
        $("#" + previousmove).find(".playpiece").first().prop("src", filepath + "pics/PreviousKnight.png");
        $("#" + previousmove).find(".playpiece").first().css({'opacity': '0.3'});
    }
    
    $("#" + index).css({'backgroundColor': '#1e73be'});
    $("#" + index).find(".playpiece").first().prop("src", filepath + "pics/Knight.png");
    previousmove = index;
    moves[index] = true;
    nummoves++;
    backmove.push(index);

    FindPossibleMoves(index);
    $(".infobox").css({'visibility': 'visible'});
    UpdateInfoBox(index);
}

function AutoMagically()
{
    if (true)//$('.footerinfo').html().split(",")[2] === "index")
    {
        AutoMagically2();
    }
    else
    {
        var ktams = GetKtAutoMoves(backmove[0]);
        var index = 0;

        ResetBoard();

        winorlose = true;
        $(".gamebutton").prop("disabled", true);
        $(".autolink").css({'pointer-events': 'none'});

        interval = setInterval(function() 
        {
            AutoMove(ktams[index++]);

            if (nummoves === 64)
            {
                $(".infobox").css({'backgroundColor': '#1e73be'});
                $(".infobox").html("<p>Congratulations! To Me!</p><p>I am, indeed, an impressively smart computer!&nbsp;&nbsp;&nbsp;<img id=\"smilesmallpic\" src=\"" + filepath + 
                "pics/smilesmall.png\" alt=\"SmileSmall\">&nbsp;&nbsp;&nbsp;</p>");
                clearInterval(interval);
                winorlose = false;
                $(".gamebutton").prop({'disabled': false});
                $(".autolink").css({'pointer-events': 'auto'});
            }
        }, 300);
    }
}
var test = 63;
function AutoMagically2()
{
    BackTrackTrapsAndOrphans(backmove, moves);
    var ktams = GetDynamicAutoMoves(Array.copy(backmove), backmove.length - 1, Array.copy(moves));
    var index = backmove.length;
    test = ktams.length;
//    $(".log").html("");
//    for (var z = 0; z < ktams.length; z++)
//        $(".log").html($(".log").html() + "<br>" + z + " : " + ktams[z]);
    
    winorlose = true;
    $(".gamebutton").prop("disabled", true);
    $(".autolink").css({'pointer-events': 'none'});

    interval = setInterval(function() 
    {
        AutoMove(ktams[index++]);

        if (nummoves === test)
        {
            $(".infobox").css({'backgroundColor': '#1e73be'});
                $(".infobox").html("<p>Congratulations to me!</p><p>I am, indeed, an impressively smart computer!&nbsp;&nbsp;&nbsp;<img id=\"smilesmallpic\" src=\"" + filepath + 
                "pics/smilesmall.png\" alt=\"SmileSmall\">&nbsp;&nbsp;&nbsp;</p>");
            clearInterval(interval);
            winorlose = false;
            $(".gamebutton").prop({'disabled': false});
            $(".autolink").css({'pointer-events': 'auto'});
        }
    }, 400);
}

var trap = null;
var badturn = null;
function GetDynamicAutoMoves(fullroute, jumpoff, cmoves)
{
    trap = [];
    for (var fullrouteI = jumpoff; fullrouteI < test; fullrouteI++)
    {
        if (fullroute.length === 1)
            if ($.inArray(fullroute[0], [0, 7, 56, 63]) > -1)
            {
                var r = MyRand(0, 1);
                fullroute.push(boardmovesarray[fullroute[0]][r]);
                cmoves[boardmovesarray[fullroute[0]][r]] = true;
                continue;
            }
        
        var nam = NextAutoMove(Array.copy(cmoves), fullroute[fullrouteI]);

        if (nam === 30) 
        {
            fullroute.push(nam);
            cmoves[nam] = true;
        }
        else if (nam === -1)
        {
//            badturn = [fullroute[jumpoff], fullroute[jumpoff + 1]];
//            fullroute = fullroute.slice(0, fullroute[jumpoff + 1]);
//            fullroute = GetDynamicAutoMoves(Array.copy(fullroute), jumpoff, Array.copy(cmoves));
            //fullroute = RepairRoute(Array.copy(cmoves), Array.copy(fullroute));
            
            $(".log").html("");
            $(".log").html("<br>------------------------------------------------------------");
            for (var z = 0; z < fullroute.length; z++)
                $(".log").html($(".log").html() + "<br>" + z + " : " + fullroute[z]);
            $(".log").html("<br>------------------------------------------------------------");
            break;
        }
        else 
        {
            fullroute.push(nam);
            cmoves[nam] = true;
        }
    }
    return fullroute;
}

function RepairRoute(cmoves, fullroute)
{
    var openindices = [];
    
    function OpenIndicesNotMovable()
    {
        openindices = [];
        for (var a = 0; a < 64; a++)
            if (!cmoves[a])
                openindices.push(a);
        
        var rt = false;
        for (var a = 0; a < openindices.length; a++)
        {
            if (rt === true || BMAExcluded(Array.copy(cmoves), openindices[a]) < 1 || Orphans(Array.copy(cmoves), openindices[a]) > -1)
                rt = true;
            else
                rt = false;
        }
        return rt;
    }

    function AddRemoveMove(switcher, flrte, cmovs)
    {
        switch (switcher)
        {
            case -1:
                cmovs[flrte[flrte.length - 1]] = false;
                flrte.pop();
                break;
            default:
                cmovs[switcher] = true;
                flrte.push(switcher);
        }
    }
    
    while (OpenIndicesNotMovable())
        AddRemoveMove(-1, fullroute, cmoves);
    
    var shift = {};
    var bar = fullroute[fullroute.length - 1];
    shift[bar] = BMAExcluded(cmoves, bar);
    for (var x = 0; x < openindices.length; x++)
        shift[openindices[x]] = BMAExcluded(cmoves, openindices[x]);
    
    var routedata = [];
    for (var n in shift)
    {
        var pr = [];
        for (var x = 0; x < shift[n].length; x++)
            pr.push(shift[n][x]);
        routedata.push(pr);
    }
    
    var possibleroute = [];
    for (var x = 0; x < routedata.length; x++)
        possibleroute.push(routedata[x][0]);
    
    if (possibleroute.length === openindices.length)
        fullroute.push.apply(fullroute, possibleroute);
//    var fr = Array.copy(fullroute);
//    var cm = Array.copy(cmoves);
//    var bar = fullroute[fullroute.length - 1];
//
//    while (fullroute.length < 64)
//    {
//        for (var x = 0; x < openindices.length; x++)
//        {
//            
//        }
//    }
    return fullroute;
}

var INDEX = 0;
var COUNT = 1;
function NextAutoMove(cmoves, index)
{
    var rt = -1;

    function FFM(endex)
    {
        var i = boardmovesarray[endex];        
        var j = {};
        j[0] = [];
        j[1] = [];

        for (var x = 0; x < i.length; x++)
        {
            if (!cmoves[i[x]])
            {
                var k = boardmovesarray[i[x]];
                var st = 0;
                for (var t = 0; t < k.length; t++)
                    if (!cmoves[k[t]] && k[t] !== parseInt(endex) && k[t] !== i[x] && k[t] !== parseInt(index))
                            st++;
                j[INDEX].push(i[x]);
                j[COUNT].push(st);
            }
        }
        return j;
    }
    
    var possiblemoves = FFM(index);
    var weightedmoves = {};
    weightedmoves[INDEX] = [];
    weightedmoves[COUNT] = [];
    for (var a = 0; a < possiblemoves[INDEX].length; a++)
    {
        var caught = Orphans(Array.copy(cmoves), possiblemoves[INDEX][a]);
        
        if (caught !== -1)
            trap.push(possiblemoves[INDEX][a]);
        else if (caught === -1)
        {
            var ct = -1;
            var bmae = BMAExcluded(Array.copy(cmoves), possiblemoves[INDEX][a]);
            
            for (var b = 0; b < bmae.length; b++)
            {
                //var p = bmae.length > 1 ? -1 : $.inArray(bmae[b], trap);
                var p = $.inArray(bmae[b], trap);
                ct = p > -1 ? p : ct;
            }
            
            //var bt = [index, possiblemoves[INDEX][a]];
            if (ct === -1)// && (badturn !== null && possiblemoves[INDEX][a] !== badturn))
            {
                weightedmoves[INDEX].push(possiblemoves[INDEX][a]);
                weightedmoves[COUNT].push(possiblemoves[COUNT][a]);
            }
        }
    }
    
    var wm_min = Array.min(weightedmoves[1]);
    var ties = [];
    for (var a = 0; a < weightedmoves[INDEX].length; a++)
        if (weightedmoves[COUNT][a] === wm_min)
            ties.push(weightedmoves[INDEX][a]);
    
    switch (ties.length)
    {
        case 0:
            rt = TieBreaker(Array.copy(cmoves), possiblemoves[INDEX]);
            break;
        case 1:
            rt = ties[0];
            break;
        default:
            rt = TieBreaker(Array.copy(cmoves), ties);
    }

    return rt;
}

function TieBreaker(cmoves, ties)
{
    var quadrants = [[0,1,2,3,8,9,10,11,16,17,18,19,24,25,26,27],[4,5,6,7,12,13,14,15,20,21,22,23,28,29,30,31],[32,33,34,35,40,41,42,43,48,49,50,51,56,57,58,59],[36,37,38,39,44,45,46,47,52,53,54,55,60,61,62,63]];
    var quads = {};
    quads[INDEX] = [];
    quads[COUNT] = [];
    
    for (var x = 0; x < quadrants.length; x++)
    {
        var c = 0;
        for (var y = 0; y < quadrants[x].length; y++)
        {
            var found = false;
            for (var z = 0; z < ties.length; z++)
                if ($.inArray(ties[z], quadrants[x]) > -1) found = true;
            if (cmoves[quadrants[x][y]]) c++;
        }
        
        if (c !== 16 && found)
        {
            quads[INDEX].push(x);
            quads[COUNT].push(c);
        }
    }
    
    var qmax = Array.max(quads[COUNT]);
    var q = [];
    for (var a = 0; a < quads[COUNT].length; a++)
        if (quads[COUNT][a] === qmax)
            q.push(quads[INDEX][a]);
    
    var priorityquad = -1;
    for (var f = 0; f < q.length; f++)
        for (var e = 0; e < quadrants[q[f]].length; e++)
            if (Orphans(Array.copy(cmoves), quadrants[q[f]][e]) > -1)
                priorityquad = q[f];
    
    var rt = -1;
    var preferred = [];
    for (var b = 0; b < ties.length; b++)
        for (var c = 0; c < q.length; c++)
        {
            var swq = [19,23,51,55];
            var test = ties[b] + (ties[b] <= swq[q[c]] ? 8 : -8);
            if ($.inArray(ties[b], quadrants[q[c]]) > -1 && $.inArray(test, quadrants[q[c]]) > -1)
            {
                if (priorityquad !== -1 && q[c] === priorityquad)
                    rt = ties[b];
                else
                    preferred.push(ties[b]);
            }
        }
    
    var min = 255;
    if (preferred.length > 1 && rt === -1)
    {
        for (var d = 0; d < preferred.length; d++)
        {
            var len = BMAExcluded(Array.copy(cmoves), preferred[d]).length;
            if (len < min)
            {
                rt = preferred[d];
                min = len;
            }
        }
    }
    else if (preferred.length === 1 && rt === -1)
        rt = preferred[0];
    
    return rt;
}

function BackTrackTrapsAndOrphans(backmove, moves)
{
    for (var x = 0; x < backmove.length; x++)
    {
        var o = Orphans(Array.copy(moves), backmove[x]);
        if (o !== -1)
        {
            while (Orphans(Array.copy(moves), backmove[x]) !== -1)
            {
                BackMove();
            }
            return;
        }
    }
}

function Orphans(cmoves, index)
{
    var rt = -1;
    cmoves[index] = true;
    for (var x = 0; x < 64; x++)
        if (!cmoves[x])
        {
            var poc = 0;
            for (var y = 0; y < boardmovesarray[x].length; y++)
                if (cmoves[boardmovesarray[x][y]])// && boardmovesarray[x][y] !== index)
                    poc++;

            if (poc === boardmovesarray[x].length) 
                rt = x;
        }
    cmoves[index] = false;
    return rt;
}

function BMAExcluded(cmoves, index)
{
    var rt = [];
    for (var x = 0; x < boardmovesarray[index].length; x++)
        if (!cmoves[boardmovesarray[index][x]])
            rt.push(boardmovesarray[index][x]);
    return rt;
}

function GetKtAutoMoves(index)
{
    ktams = 
        [[0,17,32,49,59,53,63,46,61,55,38,23,6,12,2,8,25,40,57,42,48,58,52,62,47,30,15,5,11,1,16,10,4,21,31,14,20,3,9,24,18,33,27,37,43,26,36,19,13,7,22,28,34,51,41,56,50,35,29,44,54,60,45,39],
        [1,16,33,48,58,41,56,50,40,57,51,61,55,38,23,6,12,2,8,25,10,0,17,32,49,59,42,27,44,34,24,9,3,18,35,52,62,47,53,63,46,29,19,4,14,31,21,36,26,11,5,15,30,20,37,43,60,54,39,45,28,13,7,22],
        [2,8,25,40,57,51,61,55,38,23,6,12,22,7,13,3,9,24,41,56,50,60,54,39,45,62,47,30,15,5,11,1,16,33,48,58,52,35,18,28,34,17,0,10,4,19,29,44,27,21,31,14,20,37,43,49,32,26,36,42,59,53,63,46],
        [3,13,7,22,39,54,60,50,56,41,24,9,19,4,14,31,46,63,53,59,49,32,17,0,10,16,33,48,58,52,62,47,30,15,5,11,1,18,12,2,8,25,40,57,51,61,55,38,23,6,21,27,42,36,26,20,37,43,28,45,35,29,44,34],
        [4,14,31,46,63,53,59,49,32,17,0,10,16,1,11,5,15,21,6,23,38,55,61,51,57,40,25,8,2,12,27,42,48,33,18,24,9,3,20,26,36,19,34,44,29,39,54,60,50,56,41,58,43,28,13,7,22,37,52,35,45,30,47,62],
        [5,15,30,47,62,52,58,48,33,16,1,11,17,0,10,4,14,31,21,6,23,13,7,22,39,54,60,50,56,41,24,9,3,20,37,27,12,2,8,18,35,25,40,57,42,32,26,43,49,59,53,63,46,36,19,29,44,34,51,61,55,45,28,38],
        [6,23,13,7,22,5,15,30,47,62,52,58,48,33,16,1,11,17,0,10,4,14,31,21,27,12,2,8,25,40,57,42,32,49,59,53,63,46,36,19,9,3,18,24,34,51,61,55,38,28,43,26,41,56,50,44,29,35,20,37,54,60,45,39],
        [7,13,3,9,24,41,56,50,40,57,51,61,55,38,23,6,12,2,8,25,19,4,14,31,21,15,5,22,39,29,46,63,53,59,49,32,17,0,10,16,1,11,26,36,42,48,58,52,62,47,30,20,35,18,33,27,44,34,28,45,60,43,37,54],
        [8,2,17,0,10,16,1,11,5,15,30,47,62,52,58,48,33,18,24,9,3,20,14,4,19,25,40,57,42,32,49,59,53,63,46,31,21,36,26,41,56,50,35,29,12,6,23,13,7,22,39,54,60,43,37,27,44,34,51,61,55,45,28,38],
        [9,24,41,56,50,40,57,51,61,55,38,23,6,12,2,8,25,10,0,17,32,49,34,19,4,14,31,21,15,5,11,1,16,26,20,3,18,33,48,58,43,60,54,44,27,42,59,53,63,46,36,30,13,7,22,28,45,39,29,35,52,37,47,62],
        [10,0,17,32,49,59,53,63,46,61,55,38,23,6,12,2,8,25,40,57,42,48,58,52,62,47,30,15,5,11,1,16,33,27,21,4,14,31,37,43,60,54,44,50,56,41,24,9,26,20,3,18,35,29,39,45,51,36,19,34,28,13,7,22],
        [11,1,16,33,48,58,41,56,50,40,57,51,61,55,38,23,6,12,2,8,25,10,0,17,32,49,59,42,27,44,34,24,9,26,43,60,54,39,29,19,4,14,31,21,15,5,22,7,13,3,18,28,45,35,20,37,52,62,47,30,36,53,63,46],
        [12,6,23,13,7,22,5,15,30,47,62,52,58,48,33,16,1,11,17,0,10,4,14,31,21,27,37,20,3,9,24,18,8,2,19,25,40,57,42,32,49,59,53,63,46,36,26,43,28,34,51,41,56,50,35,29,39,45,60,54,44,61,55,38],
        [13,7,22,5,15,30,47,62,52,58,48,33,16,1,11,17,0,10,4,14,31,21,6,23,38,55,61,46,63,53,59,49,32,42,57,40,25,8,2,12,27,37,43,28,18,3,20,26,9,24,41,56,50,35,29,19,36,51,34,44,54,60,45,39],
        [14,4,10,0,17,32,49,59,53,63,46,31,21,15,5,11,1,16,33,48,58,52,62,47,30,13,7,22,39,54,60,50,56,41,24,9,3,18,8,2,12,6,23,38,55,61,51,57,40,25,19,29,44,34,28,45,35,20,37,43,26,36,42,27],
        [15,5,11,1,16,33,48,58,41,56,50,40,57,51,61,55,38,23,6,21,4,14,31,46,63,53,59,49,32,17,0,10,25,8,2,12,27,42,36,26,9,24,18,3,20,35,52,62,47,30,13,7,22,37,43,28,34,19,29,44,54,60,45,39],
        [16,1,11,5,15,30,47,62,52,58,48,33,50,56,41,24,9,3,18,8,2,17,0,10,4,14,20,26,32,49,59,42,57,40,25,35,45,60,43,53,63,46,31,37,54,39,22,7,13,28,34,19,36,51,61,55,38,44,27,21,6,12,29,23],
        [17,0,10,16,1,11,5,15,30,47,62,52,58,48,33,50,56,41,24,9,3,18,8,2,12,6,23,13,7,22,39,54,60,45,55,61,51,57,40,25,35,20,26,32,49,34,28,43,37,27,42,59,44,38,53,63,46,36,19,29,14,4,21,31],
        [18,8,2,12,6,23,13,7,22,5,15,30,47,62,52,58,48,33,16,1,11,17,0,10,4,14,31,21,27,37,20,3,9,24,41,56,50,40,57,42,32,26,43,49,59,53,63,46,36,19,25,35,29,39,54,60,45,51,34,28,38,44,61,55],
        [19,9,24,41,56,50,40,57,51,61,55,38,23,6,12,2,8,25,10,0,17,32,49,34,44,59,42,48,58,52,62,47,53,63,46,36,26,16,1,11,5,15,21,4,14,31,37,27,33,43,60,54,39,29,35,18,3,20,30,45,28,13,7,22],
        [20,3,9,24,41,56,50,40,57,51,61,55,38,23,6,12,2,8,25,10,0,17,32,49,34,19,4,14,31,21,15,5,11,1,16,26,36,30,13,7,22,28,18,33,48,58,43,60,45,35,29,39,54,44,27,42,59,53,63,46,52,37,47,62],
        [21,6,23,38,55,61,51,57,40,25,8,2,12,22,7,13,3,9,24,41,56,50,60,54,39,45,62,47,30,15,5,11,1,16,33,48,58,52,35,18,28,34,17,0,10,4,19,29,44,27,42,32,49,59,53,63,46,36,26,43,37,20,14,31],
        [22,7,13,3,9,24,41,56,50,40,57,51,61,55,38,23,6,12,2,8,25,19,4,14,31,21,15,5,11,1,16,10,0,17,32,49,34,28,18,33,48,58,43,26,20,35,29,39,45,60,54,44,27,37,52,62,47,30,36,42,59,53,63,46],
        [23,6,12,2,8,25,40,57,51,61,55,38,53,63,46,31,14,4,10,0,17,32,49,59,42,48,58,52,62,47,37,27,21,15,5,11,1,16,33,43,60,54,44,50,56,41,24,34,19,9,26,36,30,20,3,18,35,29,39,45,28,13,7,22],
        [24,9,3,13,7,22,5,15,30,47,62,52,58,48,33,16,1,18,8,2,12,6,23,38,55,61,46,63,53,59,49,32,17,0,10,4,14,31,21,11,28,43,26,20,37,27,42,57,40,25,19,36,51,34,44,29,39,54,60,45,35,41,56,50],
        [25,8,2,17,0,10,16,1,11,5,15,30,47,62,52,58,48,33,18,24,9,3,20,14,4,19,13,7,22,12,6,23,29,39,54,60,50,56,41,35,45,55,61,51,57,40,34,28,38,44,27,21,31,37,43,49,32,26,36,42,59,53,63,46],
        [26,16,1,11,5,15,30,47,62,52,58,48,33,50,56,41,24,9,3,18,8,2,17,0,10,4,14,20,35,25,40,57,42,32,49,59,53,63,46,31,21,36,19,34,51,61,55,45,60,43,28,13,7,22,37,27,12,6,23,38,44,29,39,54],
        [27,10,0,17,32,49,59,53,63,46,31,14,4,21,15,5,11,1,16,33,48,58,52,62,47,30,13,7,22,39,54,60,50,56,41,24,9,3,18,8,2,12,6,23,38,55,61,51,57,40,25,19,29,44,34,28,45,35,20,37,43,26,36,42],
        [28,11,1,16,33,48,58,41,56,50,40,57,51,61,55,38,23,6,12,2,8,18,24,9,3,13,7,22,5,15,21,4,14,31,46,63,53,59,49,32,17,0,10,25,42,27,44,34,19,36,26,43,60,54,39,29,35,20,37,52,62,45,30,47],
        [29,14,4,10,0,17,32,49,59,53,63,46,31,21,6,23,38,55,61,44,54,39,22,7,13,3,9,24,34,40,57,51,41,56,50,60,45,62,47,30,15,5,11,1,16,26,20,35,25,8,2,19,36,42,48,58,52,37,27,12,18,33,43,28],
        [30,15,5,11,1,16,33,48,58,41,56,50,40,57,51,61,55,45,60,54,39,22,7,13,3,9,24,18,8,2,12,6,23,38,28,34,17,0,10,25,19,4,21,27,44,59,49,32,42,36,26,43,53,63,46,29,35,20,14,31,37,52,62,47],
        [31,14,4,10,0,17,32,49,59,53,63,46,61,55,38,23,6,21,15,5,11,1,16,33,48,58,43,60,54,39,29,44,50,56,41,24,9,26,20,3,18,8,2,12,27,37,22,7,13,28,34,40,57,51,36,19,25,42,52,35,45,30,47,62],
        [32,49,59,53,63,46,61,55,38,23,6,12,2,8,25,40,57,42,48,58,52,62,47,30,15,5,22,7,13,3,9,24,41,56,50,60,54,39,45,51,36,19,34,44,29,35,18,1,16,33,43,28,11,26,20,37,31,14,4,21,27,17,0,10],
        [33,48,58,41,56,50,40,57,51,61,55,38,23,6,12,2,8,25,10,0,17,32,49,59,42,27,44,34,24,9,3,18,1,16,26,11,5,15,21,4,19,36,53,63,46,31,14,29,35,20,30,13,7,22,28,43,60,45,39,54,37,52,62,47],
        [34,24,9,3,13,7,22,5,15,30,47,62,52,58,48,33,16,1,18,8,2,12,6,23,38,55,61,51,57,40,25,19,4,10,0,17,32,49,59,42,27,44,50,56,41,35,20,14,29,39,45,28,11,26,43,60,54,37,31,21,36,53,63,46],
        [35,25,8,2,17,0,10,16,1,11,5,15,30,47,62,52,58,48,33,18,24,9,3,20,14,4,19,13,7,22,12,6,23,29,39,54,60,50,56,41,26,32,49,43,37,31,21,27,42,57,40,34,28,45,51,36,46,63,53,59,44,61,55,38],
        [36,51,57,40,25,8,2,17,0,10,16,1,11,5,15,30,47,62,52,58,48,42,32,49,59,53,63,46,61,55,45,60,54,39,22,7,13,3,9,24,41,56,50,33,18,35,20,26,43,28,34,19,4,14,31,37,27,12,29,44,38,21,6,23],
        [37,54,60,50,56,41,24,9,3,13,7,22,39,45,62,47,30,15,5,20,14,31,46,63,53,59,49,32,26,16,1,11,17,0,10,4,21,6,23,38,55,61,51,57,40,34,28,43,58,48,33,18,8,2,12,27,44,29,19,36,42,25,35,52],
        [38,55,61,51,57,40,25,8,2,17,0,10,16,1,11,5,15,21,4,14,31,46,63,53,59,49,32,42,48,58,52,62,47,30,36,26,9,24,41,56,50,33,27,44,34,19,13,7,22,12,6,23,29,39,54,60,43,37,20,3,18,35,45,28],
        [39,54,60,50,56,41,24,9,3,13,7,22,5,15,30,47,62,45,55,61,51,57,40,25,8,2,19,4,14,31,37,20,10,0,17,32,49,34,28,11,1,16,26,43,58,48,33,18,35,52,42,59,44,27,12,29,46,63,53,36,21,6,23,38],
        [40,57,51,61,55,38,23,6,12,2,8,25,10,0,17,32,49,59,42,48,58,41,56,50,60,54,44,34,24,9,3,18,1,16,33,27,21,4,19,13,7,22,39,29,14,31,46,63,53,36,26,11,28,43,37,52,35,20,5,15,30,45,62,47],
        [41,56,50,40,57,51,61,55,38,23,6,12,2,8,25,10,0,17,32,49,59,42,48,58,52,62,47,53,63,46,31,14,4,21,15,5,11,1,16,33,27,44,34,24,9,26,36,19,29,35,18,3,20,30,13,7,22,28,43,37,54,60,45,39],
        [42,48,58,52,62,47,53,63,46,61,55,38,23,6,12,2,8,25,40,57,51,41,56,50,60,54,39,45,35,29,44,59,49,32,17,0,10,16,1,18,24,34,19,9,3,13,7,22,28,11,5,15,30,36,26,43,33,27,21,4,14,20,37,31],
        [43,49,32,17,0,10,16,1,11,5,15,30,47,62,52,58,48,33,50,56,41,24,9,26,20,3,18,8,2,12,6,23,13,7,22,28,34,40,57,51,61,55,45,60,54,39,29,35,25,19,4,14,31,37,27,42,59,44,38,21,36,53,63,46],
        [44,59,49,32,17,0,10,16,1,11,5,15,30,47,62,52,58,48,33,50,56,41,24,9,26,43,60,54,39,45,55,61,51,57,40,34,28,22,7,13,3,18,8,2,12,6,23,38,53,63,46,36,42,25,19,4,21,27,37,31,14,20,35,29],
        [45,62,47,30,15,5,11,1,16,33,48,58,52,46,63,53,59,49,32,17,0,10,4,14,31,21,6,23,38,55,61,51,57,40,25,8,2,12,27,42,36,26,9,24,41,56,50,60,43,37,20,3,18,35,29,19,34,44,54,39,22,28,13,7],
        [46,63,53,59,49,32,17,0,10,16,1,11,5,15,30,47,62,52,58,48,33,43,60,54,39,45,55,61,51,57,40,50,56,41,24,9,26,36,42,25,8,2,19,34,44,27,37,31,21,4,14,20,3,18,35,29,12,6,23,38,28,13,7,22],
        [47,62,52,58,48,33,16,1,11,5,15,30,13,7,22,39,54,60,50,56,41,24,9,3,18,8,2,12,6,23,29,35,45,55,61,51,57,40,25,19,4,14,20,10,0,17,32,26,43,49,34,28,38,44,59,42,27,37,31,21,36,53,63,46],
        [48,58,41,56,50,40,57,51,61,55,38,23,6,12,2,8,25,10,0,17,32,49,59,42,27,33,16,1,18,24,9,3,13,7,22,5,15,21,11,26,43,28,34,44,54,60,45,39,29,19,4,14,31,37,20,35,52,62,47,30,36,53,63,46],
        [49,32,17,0,10,16,1,11,5,15,30,47,62,52,58,48,33,50,56,41,24,9,26,43,60,54,39,45,55,61,51,57,40,34,28,22,7,13,3,18,8,2,12,6,23,38,44,59,53,63,46,36,42,25,19,4,21,27,37,31,14,20,35,29],
        [50,56,41,24,9,3,13,7,22,5,15,30,47,62,52,58,48,33,16,1,18,8,2,12,6,23,38,55,61,51,57,40,25,35,45,60,54,39,29,19,4,14,20,10,0,17,32,49,34,28,11,26,43,37,31,21,27,44,59,42,36,53,63,46],
        [51,57,40,25,8,2,17,0,10,16,1,11,5,15,30,47,62,52,58,48,33,50,56,41,24,9,3,18,35,20,26,32,49,34,19,4,14,31,21,6,12,27,42,59,44,61,55,45,60,54,37,43,28,13,7,22,39,29,23,38,53,36,46,63],
        [52,62,47,53,63,46,61,55,38,23,6,12,2,8,25,40,57,51,41,56,50,60,54,39,45,35,29,44,59,49,32,42,48,58,43,33,16,1,18,24,9,3,13,7,22,28,34,19,4,14,31,37,27,17,0,10,20,26,11,5,15,21,36,30],
        [53,63,46,61,55,38,23,6,12,2,8,25,40,57,51,41,56,50,60,54,39,29,44,59,49,32,17,0,10,16,1,11,5,15,21,4,14,31,37,27,33,48,42,36,26,43,58,52,62,47,30,20,35,45,28,22,7,13,3,18,24,9,19,34],
        [54,60,50,56,41,24,9,3,13,7,22,39,45,62,47,30,15,5,11,1,16,33,48,58,52,35,18,8,2,12,6,23,29,14,4,19,25,40,57,51,61,55,38,28,34,44,59,49,32,17,0,10,20,26,43,37,27,42,36,21,31,46,63,53],
        [55,61,51,57,40,25,8,2,17,0,10,16,1,11,5,15,30,47,62,45,60,54,39,22,7,13,3,9,24,41,56,50,33,48,58,52,35,18,12,6,23,29,19,4,14,20,26,32,49,34,28,43,37,31,46,63,53,59,42,36,21,27,44,38],
        [56,41,24,9,3,13,7,22,5,15,30,47,62,52,58,48,33,16,1,18,8,2,12,6,23,38,55,61,51,57,40,50,60,45,39,54,44,59,49,32,42,25,35,29,19,34,28,11,17,0,10,27,21,4,14,20,26,43,37,31,46,36,53,63],
        [57,40,25,8,2,17,0,10,16,1,11,5,15,30,47,62,52,58,48,33,50,56,41,24,9,3,18,35,20,26,32,49,59,42,27,12,6,23,13,7,22,37,43,60,54,39,45,28,34,51,61,55,38,44,29,19,4,14,31,21,36,53,63,46],
        [58,48,33,16,1,11,5,15,30,47,62,52,46,63,53,59,49,32,17,0,10,4,14,31,21,6,23,38,55,61,51,57,40,25,8,2,12,27,42,36,26,9,24,41,56,50,44,34,19,29,35,18,3,20,37,43,60,54,39,45,28,13,7,22],
        [59,49,32,17,0,10,16,1,11,5,15,30,47,62,52,58,48,33,50,56,41,24,9,26,43,60,54,39,45,55,61,51,57,40,34,44,27,42,25,8,2,19,4,14,20,3,18,35,29,12,6,23,13,7,22,28,38,21,36,53,63,46,31,37],
        [60,54,39,22,7,13,3,9,24,41,56,50,40,57,51,61,55,45,62,47,30,15,5,11,1,16,33,48,58,52,35,18,8,25,10,0,17,2,12,6,23,29,19,4,14,20,26,32,49,34,28,43,37,31,46,63,53,59,42,36,21,27,44,38],
        [61,55,38,23,6,12,2,8,25,40,57,51,41,56,50,60,54,39,45,62,47,53,63,46,31,14,4,10,0,17,32,49,59,44,29,35,52,58,48,42,27,33,16,1,18,24,34,19,9,3,13,7,22,28,43,37,20,26,11,5,15,21,36,30],
        [62,47,53,63,46,61,55,38,23,6,12,2,8,25,40,57,51,41,56,50,60,54,39,45,35,52,58,48,33,16,1,18,24,9,3,13,7,22,28,43,49,59,42,32,26,11,5,15,30,36,19,34,17,0,10,4,21,27,44,29,14,20,37,31],
        [63,53,59,49,32,17,0,10,16,1,11,5,15,30,47,62,52,58,48,33,43,60,54,39,45,55,61,46,31,37,22,7,13,3,9,24,41,56,50,40,57,51,34,28,18,8,2,12,6,23,38,44,27,42,25,35,20,26,36,21,4,19,29,14]];
    
    return ktams[index];
}

$.cssHooks.backgroundColor = 
{
    get: function(elem) 
    {
        if (elem.currentStyle)
            var bg = elem.currentStyle["backgroundColor"];        
        else if (window.getComputedStyle)
            var bg = document.defaultView.getComputedStyle(elem, null).getPropertyValue("background-color");
        
        if (bg.search("rgb") === -1)
            return bg;
        else 
        {
            bg = bg.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
            return (bg && bg.length === 4) ? "#" + ("0" + parseInt(bg[1],10).toString(16)).slice(-2) + ("0" + parseInt(bg[2],10).toString(16)).slice(-2) + ("0" + parseInt(bg[3],10).toString(16)).slice(-2) : '';
        }
    }
};

Array.min = function(array){ return Math.min.apply(Math, array); };

Array.max = function(array){ return Math.max.apply(Math, array); };

Array.copy = function(array)
{
    var rt = [];    
    for (var x = 0; x < array.length; x++)
        rt[x] = array[x];    
    return rt;
};

var iterifyArr = function (arr) {
    var cur = 0;
    arr.next = (function () { return (++cur >= this.length) ? false : this[cur]; });
    arr.prev = (function () { return (--cur < 0) ? false : this[cur]; });
    arr.cur = (function () { return this[cur]; });
    return arr;
};

function MyRand(min, max)
{
    var r = [];
    var o = [];
    for (var x = 0; x < 1000; x++)
    {
        r[x] = Math.floor((Math.random() * 2) + 1) - 1;
        o[x] = Math.floor((Math.random() * 2) + 1) - 1;
    }
    var rt = [_.random(min, max) === min ? Array.min(r) : Array.max(r), _.random(min, max) === min ? Array.min(o) : Array.max(o)];
    _.shuffle(rt);
    return rt[_.random(min, max)];
}