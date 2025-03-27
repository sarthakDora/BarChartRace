import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';

interface DataPoint {
  date: string;
  affiliate: string;
  aum: number;
}

interface Frame {
  date: string;
  data: { name: string; value: number }[];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  ngOnInit(): void {
    this.createBarChartRace();
  }

  private async createBarChartRace(): Promise<void> {
    const data = await d3.json<DataPoint[]>('/assets/data.json');
    if (!data) {
      console.error('Failed to load data.json or data is undefined');
      return;
    }

    const dates = [...new Set(data.map(d => d.date))].sort();
    const affiliates = [...new Set(data.map(d => d.affiliate))];

    // Create frames with ranked data
    const frames: Frame[] = dates.map(date => {
      const frameData = data.filter(d => d.date === date);
      const ranked = affiliates.map(affiliate => {
        const entry = frameData.find(d => d.affiliate === affiliate) || { aum: 0 };
        return { name: affiliate, value: +entry.aum };
      }).sort((a, b) => b.value - a.value); // Sort by AUM descending
      return { date, data: ranked };
    });

    // SVG setup
    const svg = d3.select('svg'),
      margin = { top: 50, right: 50, bottom: 50, left: 150 }, // Increased left margin for labels
      width = +svg.attr('width') - margin.left - margin.right,
      height = +svg.attr('height') - margin.top - margin.bottom,
      g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleLinear().range([0, width]);
    const y = d3.scaleBand().range([0, height]).padding(0.1);

    // Color scale for affiliates
    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(affiliates);

    x.domain([0, d3.max(frames, frame => d3.max(frame.data, d => d.value)) || 0]);

    // Date label
    const dateLabel = svg
      .append('text')
      .attr('class', 'date-label')
      .attr('x', margin.left + width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle');

    let frameIndex = 0;
    const updateChart = () => {
      const frame = frames[frameIndex];

      // Update y domain based on current ranking
      y.domain(frame.data.map(d => d.name)); // Order by current ranking
      x.domain([0, d3.max(frame.data, d => d.value) || 0]);

      // Update bars
      const bars = g.selectAll<SVGRectElement, { name: string; value: number }>('.bar')
        .data(frame.data, d => d.name);

      bars.enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('y', d => y(d.name) || 0)
        .attr('height', y.bandwidth())
        .attr('x', 0)
        .attr('width', 0)
        .attr('fill', d => color(d.name)) // Assign color based on affiliate
        .merge(bars)
        .transition()
        .duration(750)
        .attr('y', d => y(d.name) || 0) // Move up/down based on ranking
        .attr('width', d => x(d.value));

      bars.exit().remove();

      // Update labels (on the left)
      const labels = g.selectAll<SVGTextElement, { name: string; value: number }>('.label')
        .data(frame.data, d => d.name);

      labels.enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', -10) // Position to the left of the bars
        .attr('y', d => (y(d.name) || 0) + y.bandwidth() / 2)
        .attr('dy', '.35em')
        .attr('text-anchor', 'end') // Right-align text
        .text(d => d.name) // Show only affiliate name
        .merge(labels)
        .transition()
        .duration(750)
        .attr('y', d => (y(d.name) || 0) + y.bandwidth() / 2);

      labels.exit().remove();

      // Optional: Add value labels to the right of bars
      const valueLabels = g.selectAll<SVGTextElement, { name: string; value: number }>('.value-label')
        .data(frame.data, d => d.name);

      valueLabels.enter()
        .append('text')
        .attr('class', 'value-label')
        .attr('x', d => x(d.value) + 5)
        .attr('y', d => (y(d.name) || 0) + y.bandwidth() / 2)
        .attr('dy', '.35em')
        .text(d => d.value)
        .merge(valueLabels)
        .transition()
        .duration(750)
        .attr('x', d => x(d.value) + 5)
        .attr('y', d => (y(d.name) || 0) + y.bandwidth() / 2)
        .text(d => d.value);

      valueLabels.exit().remove();

      dateLabel.text(frame.date);

      frameIndex = (frameIndex + 1) % frames.length;
    };

    updateChart();
    setInterval(updateChart, 1000);
  }
}