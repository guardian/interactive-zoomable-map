import * as d3B from 'd3/index'
import * as d3Select from 'd3-selection'
import {event as currentEvent} from 'd3-selection';
import * as d3Queue from 'd3-queue'
import * as topojson from 'topojson'
import * as d3geo from 'd3-geo'
import * as d3Voronoi from 'd3-voronoi'
import { $ } from "./util"
import textures from 'textures'

let d3 = Object.assign({}, d3B, d3Select, d3Queue, d3geo);

const londonMapURL = "<%= path %>/assets/boroughs.json";
const murdersURL = "https://interactive.guim.co.uk/docsdata-test/1erOIBZw9NPHIW2IaTVox8Z8XfeKr7hMim31i183RZhA.json"
const mapEl = $(".interactive-wrapper");

let width = mapEl.getBoundingClientRect().width;
let height = width*(711 / 860);
let active = d3.select(null);

let projection = d3.geoMercator()
    .scale(0)
    .translate([width / 2, height / 2]);
 
let zoom = d3.zoom()
	.scaleExtent([1, 4])
    .on("zoom", zoomed);
  
let initialTransform = d3.zoomIdentity
    .translate(0,0)
    .scale(1);
  
let path = d3.geoPath()
    .projection(projection);

let svg = d3.select(".interactive-wrapper").append("svg")
    .attr("width", width)
    .attr("height", height)
    .on("click", stopped, true);

svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .on("click", reset);

let g = svg.append("g");

let borough = d3.select(".interactive-wrapper").append('div').attr('class', 'borough-headline')

svg
    .call(zoom) // delete this line to disable free zooming
    .call(zoom.transform, initialTransform)
    .on("wheel.zoom", null)
    .on("mousedown.zoom", null)
    .on("touchstart.zoom", null)
    .on("touchmove.zoom", null)
    .on("touchend.zoom", null);

Promise.all([
	d3.json(londonMapURL),
	d3.json(murdersURL)
	])
.then(ready)

function ready(data) {

	let london = data[0];
	let murders = data[1].sheets.Latest;

	projection.fitSize([width, height], topojson.feature(london, london.objects['boroughs']));

	let boroughsMerged = topojson.merge(data[0], data[0].objects['boroughs'].geometries);

  g.selectAll("path")
      .data(topojson.feature(london, london.objects.boroughs).features)
    .enter().append("path")
      .attr("d", path)
      .attr("class", "feature")
      .on("click", clicked);

  g.append("path")
      .datum(topojson.mesh(london, london.objects.boroughs, function(a, b) { return a !== b; }))
      .attr("class", "mesh")
      .attr("d", path);

   g
	.append('path')
	.datum(boroughsMerged)
	.attr('d', path)
	.attr('class', 'outline-main-map')

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
			if(m.Method == 'Shot') radius = 6.1325
				else radius =  6.875
			}
		else radius =  3

			positions.push({
				cx: projection([+m.long, +m.lat])[0],
				cy: projection([+m.long, +m.lat])[1],
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

	let circles = g.selectAll("circle")
	.data(positions)
	.enter()
	.append('circle')
	.attr('cx', d => d.cx)
	.attr('cy', d => d.cy)
	.attr('class', d => d.className)
	.attr('id', (d,i) => "c"+i)
	.attr('r', d => d.r)
};

function clicked(d) {

	borough.html(d.properties.name);

	let texture = textures.lines()
	.size(1)
	.stroke("#dadada")
	.strokeWidth(0.3);

	g.call(texture)

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

  svg.transition()
      .duration(1000)
      .call(zoom.transform, transform);
}

function reset() {

borough.html('')
d3.selectAll('.feature').style('fill', 'white')

  active.classed("active", false);
  active = d3.select(null);

  svg.transition()
      .duration(750)
      .call(zoom.transform, initialTransform);
}

function zoomed() {

	makeVoronoi()
  let transform = currentEvent.transform; 

  g.select('.mesh').style("stroke-width", .5 / transform.k + "px");
  g.selectAll('circle').attr('r', 3 / transform.k + "px").style("stroke-width", .5 / transform.k + "px");
  g.attr("transform", transform);

  g.selectAll('circle')
  .on('mouseover', (d,i) => {
		d3.select('#c' + i).classed(" over", true)
	})
	.on('mouseout', d => {
		g.select(".over").classed(" over", false)
	})
  .on('mousemove', d => {console.log(d)})
  
}

// If the drag behavior prevents the default click,
// also stop propagation so we don’t click-to-zoom.
function stopped() {
  if (currentEvent.defaultPrevented) currentEvent.stopPropagation();
}


function makeVoronoi()
{

}