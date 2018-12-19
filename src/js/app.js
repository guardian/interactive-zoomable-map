import * as d3B from 'd3/index'
import * as d3Select from 'd3-selection'
import {event as currentEvent} from 'd3-selection';
import * as d3Queue from 'd3-queue'
import * as topojson from 'topojson'
import * as d3geo from 'd3-geo'
import * as d3Voronoi from 'd3-voronoi'
import { $ } from "./util"
import textures from 'textures'
import * as d3Jetpack from 'd3-jetpack'
import * as d3Swoopydrag from 'd3-swoopy-drag'
import {wide, showcaseAnn, articleAnn, tabletAnn, smallTabletAnn} from '../assets/annotations.js'


let d3 = Object.assign({}, d3B, d3Select, d3Queue, d3geo,d3Jetpack, d3Swoopydrag);

const londonMapURL = "<%= path %>/assets/boroughs.json";
const murdersURL = "https://interactive.guim.co.uk/docsdata-test/1erOIBZw9NPHIW2IaTVox8Z8XfeKr7hMim31i183RZhA.json"
const mapEl = $(".murders-type");
const monthsString = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const boroughsLabels = ['Harrow', 'Hillingdon', 'Barnet', 'Enfield', 'Havering','Bexley','Bromley','Croydon','Sutton','Merton','Hounslow','Ealing'];
const affectedBoroughs = [];
let smallMultiples = d3.select("#interactive-slot-1")
console.log(smallMultiples)
let width = mapEl.getBoundingClientRect().width;
let height = width * (711 / 860);

let padding = 12;
let isMobile


if(width < 600)
{
	isMobile = true
}
else
{
	isMobile = false
}


let active = d3.select(null);

let voronoi = d3.voronoi()
.extent([[-1, -1], [width + 1, height + 1]]);

let projection = d3.geoMercator()

let zoom = d3.zoom()
.scaleExtent([1, 4])
.on("zoom", zoomed)
.on("end", zoomEnd);

let initialTransform = d3.zoomIdentity
.translate(0,0)
.scale(1);

let path = d3.geoPath()
.projection(projection);

let london;
let murders;

let closeButton = d3.select('.tooltip-close-button');
let tooltip = d3.select(".tooltip")
let tCloseButton = d3.select(".tooltip-close-button")
let tName = d3.select(".tooltip-name")
let tAge = d3.select(".tooltip-age")
let tDate= d3.select(".tooltip-date")
let tBorough = d3.select(".tooltip-borough")
let tMethod = d3.select(".tooltip-method")

if(!isMobile)tooltip.attr('class', 'tooltip-small')

tCloseButton.on('click', closeTooltip)

let murdersMap = d3.select(".murders-type").append("svg")
.attr("width", width)
.attr("height", height)
.on("click", stopped, true);

let background = murdersMap.append("rect")
.attr("class", "background")
.attr("width", width)
.attr("height", height)
.on("click", reset);

let murdersMapGroup = murdersMap.append("g");

murdersMap
.call(zoom) // delete this line to disable free zooming
.call(zoom.transform, initialTransform)
.on("wheel.zoom", null)
.on("mousedown.zoom", null)
.on("touchstart.zoom", null)
.on("touchmove.zoom", null)
.on("touchend.zoom", null)
.on("dblclick.zoom", null);

Promise.all([
	d3.json(londonMapURL),
	d3.json(murdersURL)
	])
.then(ready)

function ready(data) {

	london = data[0];
	murders = data[1].sheets.Latest;

	let stabbings = murders.filter(m => m.Method == 'Stabbed');
	let shootings = murders.filter(m => m.Method.indexOf('Shot') != -1);
	let boroughsTotal = [];
	let murdersBorough = [];

	d3.select("#murders-total").html(murders.length)
	d3.select("#murders-stabbings").html(stabbings.length)
	d3.select("#murders-shootings").html(shootings.length)
	d3.select("#murders-others").html(murders.length - (stabbings.length + shootings.length))

	murders.map(m => boroughsTotal.push(m.Borough))

	boroughsTotal.sort()

	let current = null;
    let cnt = 0;
    for (let i = 0; i < boroughsTotal.length; i++) {
        if (boroughsTotal[i] != current) {
            if (cnt > 0) {
                murdersBorough.push({borough:current, murders:cnt});
            }
            current = boroughsTotal[i];
            cnt = 1;
        } else {
            cnt++;
        }
    }

    murdersBorough.sort(function(a,b){return b.murders - a.murders})

//THIS MAKES THE WORSE 3 BOROUGHS HIGHLIGHT---------------------------------------------
//
//Just add or delete murdersBorough[position].borough in this array to alter highlighted boroughs on the map
//
//
    affectedBoroughs.push(murdersBorough[0].borough, murdersBorough[1].borough)
//
//
//--------------------------------------------------------------------------------------

	makeMainMap()
	if(!isMobile){
		makeAnnotations()
	}
}

function makeAnnotations()
{
	console.log('makeAnnotations')
	let annotations;
	let annotationsText;

	if(width >= 600 && width < 638){annotations=smallTabletAnn; annotationsText="smallTabletAnn";}
	else if(width >= 638 && width < 660){annotations=tabletAnn; annotationsText="tabletAnn";}
	else if(width >= 660 && width < 700){annotations=articleAnn; annotationsText="articleAnn";}
	else if(width >= 700 && width < 740){annotations=showcaseAnn; annotationsText="showcaseAnn";}
	else if(width >= 740){annotations=wide; annotationsText="wide";}

	console.log('The size of annotations currently is ', annotationsText)

	if(annotations)
	{
		d3.select('#markerDefs').remove()
		
		let swoopyDrag = d3.swoopyDrag()
	    .draggable(false)
	    .x(d => d.annWidth )
	    .y(d => d.annLenght)
	    .annotations(annotations)
	    .on('drag', function(event){
	    	window.annotations = annotations;
	    })

	    let swoopy = murdersMap.append('g')
	    .attr('class', 'swoopy')
	    .call(swoopyDrag)

	    swoopy.selectAll('path')
	    .style('stroke', 'black')
	    .style('fill', 'none')
	    .style('stroke-width', '1px');

	   	let swoopyTexts = swoopy.selectAll('text').nodes()
	    d3.select(swoopyTexts[0]).attr('class', 'annotation-headline')
	    d3.select(swoopyTexts[1]).attr('class', 'annotation-text')
	    d3.select(swoopyTexts[2]).attr('class', 'annotation-headline')
	    d3.select(swoopyTexts[3]).attr('class', 'annotation-text')
	   
	   

	    swoopy.selectAll('text')
	    .each(function(d){

	    	let vertical;
	    	let horizontal;

	    	if(d.class == 'headline'){vertical = 22; horizontal = 20;}
	    	else{vertical = 18; horizontal = 18;}
	      d3.select(this)
	          .text('')//clear existing text
	          .tspans(d3.wordwrap(d.text, horizontal), vertical)//wrap after 20 char
	    });

	    let markerDefs = murdersMap.append('svg:defs')
	    .attr('id', "markerDefs");

	    markerDefs.append('marker')
	    .attr('id', 'arrow')
	    .attr('viewBox', '-10 -10 20 20')
	    .attr('markerWidth', 20)
	    .attr('markerHeight', 20)
	    .attr('orient', 'auto')
	  	.append('path')
	    .attr('d', 'M-4.75,-4.75 L 0,0 L -4.75,4.75')
	    .style('fill', 'black')

	    

	    swoopy.selectAll('path')
	    .attr('marker-end', 'url(#arrow)');
	}
}


function makeMainMap(){

	projection.fitSize([width, height], topojson.feature(london, london.objects['boroughs']));
	let boroughsMerged = topojson.merge(london, london.objects['boroughs'].geometries);

	let texture = textures.lines()
	.size(4)
	.stroke("#dadada")
	.strokeWidth(1);

	murdersMapGroup.call(texture)

	let boroughs = murdersMapGroup.selectAll('.borough')
	.data(topojson.feature(london, london.objects.boroughs).features)
	.enter()
	.append('path')
	.attr('d', path)
	.attr('class', d => 'feature')
	.style("fill", d => {if(affectedBoroughs.indexOf(d.properties.name) != -1 && !isMobile) return texture.url()})
	.style("stroke-width", d => {if(affectedBoroughs.indexOf(d.properties.name) != -1 && !isMobile) return '1.2px'})

	if(isMobile)boroughs.on("click", clicked);
	
	murdersMapGroup.append("path")
	.datum(topojson.mesh(london, london.objects.boroughs, function(a, b) { return a !== b; }))
	.attr("class", "mesh")
	.attr("d", path);

	murdersMapGroup.append('path')
	.datum(boroughsMerged)
	.attr('d', path)
	.attr('class', 'outline-main-map')

	murdersMapGroup.selectAll('text')
	.data(topojson.feature(london, london.objects['boroughs']).features)
	.enter()
	.filter(d => boroughsLabels.indexOf(d.properties.name) != -1 && !isMobile)
	.append('text')
	.text(d => d.properties.name)
	.attr('transform', d => 'translate(' + path.centroid(d) + ')')
	.attr('class', 'borough-label')
	.attr('text-anchor', 'middle')

	let positions = [];
	let points = [];

	murders.map(m => {
		let className = m.Method + " " + m.Victim;
		let radius = 3;
		if(m.Method.indexOf('Shot') != -1 || m.Method == 'Stabbed')
		{
			className = m.Method + " " + m.Victim
		}
		else
		{
			className = 'other' + " " + m.Victim
		}
		if(width > 400)
		{
			radius = 6
		}
		else radius =  3
			positions.push({
				cx: projection([+m.long, +m.lat])[0] - radius,
				cy: projection([+m.long, +m.lat])[1] - radius,
				className: className,
				r:radius,
				name: m.Victim,
				age: m.Age,
				date: m.Date,
				borough: m.Borough,
				method: m.Method
			})
		points.push(projection([+m.long, +m.lat]))
	})

	let circles = murdersMapGroup.selectAll("circle")
	.data(positions)
	.enter()
	.append('circle')
	.attr('cx', d => d.cx + d.r)
	.attr('cy', d => d.cy + d.r)
	.attr('class', d => d.className)
	.attr('id', (d,i) => "c"+i)
	.attr('r', d => d.r)
	.style('pointer-events', 'none');

	if(!isMobile){
		const polygons = voronoi(points).polygons();

		murdersMap.selectAll(".cell")
		.data(polygons)
		.enter()
		.append("path")
		.attr("class", "cell")
		.attr("opacity", 0)
		.attr("stroke", "black")
		.attr("d", (d,i) => {return "M" + d.join("L") + "Z"})
		.on('mouseover', (d,i) => {
			d3.select('.tooltip-small').classed(" over", true)
			d3.select('#c' + i).classed(" murder-circle-over", true)
			tName.html(positions[i].name)
			tAge.html(positions[i].age + " years old")
			tDate.html(positions[i].date.split("-")[2] + ' ' + monthsString[positions[i].date.split("-")[1] - 1])
			tBorough.html(positions[i].borough)
			tMethod.html(positions[i].method)
		})
		.on('mouseout', d => {
			d3.select('.tooltip').classed(" over", false)
			murdersMap.select(".murder-circle-over").classed(" murder-circle-over", false)
		})
		.on("mousemove", mousemove)

		closeButton.style('display', 'none')
		
		function mousemove(event) {

		    tooltip.style('left', d3.mouse(this)[0] + padding + 'px')
		    tooltip.style('top', d3.mouse(this)[1]  + padding + 'px')

		    let tWidth = +tooltip.style("width").split('px')[0]
		    let tLeft = +tooltip.style("left").split('px')[0]

		    if(tLeft + tWidth > width - padding)
		    {
		    	tooltip.style('left', width - tWidth - padding + 'px')
		    }
		}
	}

}

function clicked(d) {
	d3.selectAll('.feature').style('fill', 'white')
	let texture = textures.lines()
	.size(1)
	.stroke("#dadada")
	.strokeWidth(0.3);
	murdersMapGroup.call(texture)
	d3.select(this).style('fill', texture.url())
	if (active.node() === this) return reset();
	active.classed("active", false);
	active = d3.select(this).classed("active", true);
	let bounds = path.bounds(d),
	dx = bounds[1][0] - bounds[0][0],
	dy = bounds[1][1] - bounds[0][1],
	x = (bounds[0][0] + bounds[1][0]) / 2,
	y = (bounds[0][1] + bounds[1][1]) / 2,
	scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
	translate = [width / 2 - scale * x, height / 2 - scale * y];
	let transform = d3.zoomIdentity
	.translate(translate[0], translate[1])
	.scale(scale);

	murdersMap.transition()
	.duration(1000)
	.call(zoom.transform, transform)
}

function reset() {
	d3.selectAll('.feature').style('fill', 'white')
	active.classed("active", false);
	active = d3.select(null);

	murdersMap.transition()
	.duration(750)
	.call(zoom.transform, initialTransform);
	d3.selectAll('.over').classed('over', false);
}
function zoomed() {
	let transform = currentEvent.transform; 
	murdersMapGroup.select('.mesh').style("stroke-width", .5 / transform.k + "px");
	d3.selectAll('.borough-label').style("font-size",  (12 / transform.k) + "px");
	murdersMapGroup.attr("transform", transform);
}
function stopped() {
	if (currentEvent.defaultPrevented) currentEvent.stopPropagation();
}
function zoomEnd(){
	let zoomTransform = d3.zoomTransform(this);
	if(zoomTransform.k > 1){
		murdersMapGroup.selectAll('circle')
		.on('click', d=>{
			let nodes = d3.selectAll('.murder-circle-over');
			nodes.classed('murder-circle-over', false);
			let node = d3.select('.' + d.className.split(' ').join('.'));
			node.classed("murder-circle-over", true);
			printTooltip(d);
		})
		.style('pointer-events', 'auto');
	}
	else{
		murdersMapGroup.selectAll('circle')
		.style('pointer-events', 'none');
	}
}
function printTooltip(data){
	d3.select('.tooltip').classed(" over", true)
	tName.html(data.name)
	tAge.html(data.age + " years old")
	tDate.html(data.date.split("-")[2] + ' ' + monthsString[data.date.split("-")[1] - 1])
	tBorough.html(data.borough)
	tMethod.html(data.method)
}
function closeTooltip(){
	d3.selectAll('.over').classed('over', false);
}
