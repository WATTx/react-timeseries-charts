/**
 *  Copyright (c) 2015-present, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import "d3-transition";
import _ from "underscore";
import merge from "merge";
import React from "react";
import ReactDOM from "react-dom"; // eslint-disable-line
import PropTypes from "prop-types";
import { range } from "d3-array";
import { axisLeft, axisRight } from "d3-axis";
import { format } from "d3-format";
import { select } from "d3-selection";
import "d3-selection-multi";

import { scaleAsString } from "../js/util";

const MARGIN = 0;

const defaultStyle = {
    label: {
        stroke: "none",
        fill: "#8B7E7E", // Default label color
        fontWeight: 100,
        fontSize: 12,
        font: '"Goudy Bookletter 1911", sans-serif"'
    },
    values: {
        stroke: "none",
        fill: "#8B7E7E", // Default value color
        fontWeight: 100,
        fontSize: 11,
        font: '"Goudy Bookletter 1911", sans-serif"'
    },
    tick: {
        fill: "none",
        stroke: "#EEE"
    },
    axis: {
        fill: "none",
        stroke: "#C0C0C0"
    }
};

/**
 * The `YAxis` widget displays a vertical axis to the left or right
 * of the charts. A `YAxis` always appears within a `ChartRow`, from
 * which it gets its height and positioning. You can have more than
 * one axis per row. You do control how wide it is.
 *
 * Here's a simple YAxis example:
 *
 * ```js
 * <YAxis
 *   id="price-axis"
 *   label="Price (USD)"
 *   min={0} max={100}
 *   width="60"
 *   type="linear"
 *   format="$,.2f"
 * />
 * ```
 *
 * Visually you can control the axis `label`, its size via the `width`
 * prop, its `format`, and `type` of scale (linear). You can quicky turn
 * it on and off with the `visible` prop.
 *
 * Each axis also defines a scale through a `min` and `max` prop. Chart
 * then refer to the axis by by citing the axis `id` in their `axis`
 * prop. Those charts will then use the axis scale for their y-scale.
 * This is what ties them together. Many charts can use the same axis,
 * or not.
 *
 * Here is an example of two line charts that each have their own axis:
 *
 * ```js
 * <ChartContainer timeRange={audSeries.timerange()}>
 *     <ChartRow height="200">
 *         <YAxis id="aud" label="AUD" min={0.5} max={1.5} width="60" format="$,.2f"/>
 *         <Charts>
 *             <LineChart axis="aud" series={audSeries} style={audStyle}/>
 *             <LineChart axis="euro" series={euroSeries} style={euroStyle}/>
 *         </Charts>
 *         <YAxis id="euro" label="Euro" min={0.5} max={1.5} width="80" format="$,.2f"/>
 *     </ChartRow>
 * </ChartContainer>
 * ```
 *
 *  Note that there are two `<YAxis>` components defined here, one before
 *  the `<Charts>` block and one after. This defines that the first axis will
 *  appear to the left of the charts and the second will appear right of the charts.
 *  Each of the line charts uses its `axis` prop to identify the axis ("aud" or "euro")
 *  it will use for its vertical scale.
 */
export default class YAxis extends React.Component {
    componentDidMount() {
        this.renderAxis(
            this.props.align,
            this.props.scale,
            +this.props.width,
            +this.props.chartExtent,
            this.props.absolute,
            this.props.type,
            this.props.format
        );
    }

    componentWillReceiveProps(nextProps) {
        const scale = nextProps.scale;
        const align = nextProps.align;
        const width = nextProps.width;
        const chartExtent = nextProps.chartExtent;
        const absolute = nextProps.absolute;
        const fmt = nextProps.format;
        const type = nextProps.type;

        if (
            scaleAsString(this.props.scale) !== scaleAsString(scale) ||
            this.props.align !== nextProps.align ||
            this.props.width !== nextProps.align ||
            this.props.type !== nextProps.type ||
            this.props.chartExtent !== nextProps.chartExtent
        ) {
            this.renderAxis(align, scale, width, chartExtent, absolute, type, fmt);
        }
    }

    shouldComponentUpdate() {
        // eslint-disable-line
        return false;
    }

    yformat(fmt) {
        if (_.isString(fmt)) {
            return format(fmt);
        } else if (_.isFunction(fmt)) {
            return fmt;
        } else {
            return format("");
        }
    }

    renderAxis(align, scale, width, chartExtent, absolute, type, fmt) {
        const yformat = this.yformat(fmt);

        const axis = align === "left" ? axisLeft : axisRight;

        let axisGenerator;
        if (type === "linear" || type === "power") {
            if (this.props.tickCount > 0) {
                const stepSize = (this.props.max - this.props.min) / (this.props.tickCount - 1);
                axisGenerator = axis(scale)
                    .tickValues(
                        range(this.props.min, this.props.max + this.props.max / 10000, stepSize)
                    )
                    .tickFormat(d => {
                        if (absolute) {
                            return yformat(Math.abs(d));
                        }
                        return yformat(d);
                    })
                    .tickSizeOuter(0);
            } else {
                if (this.props.height <= 200) {
                    axisGenerator = axis(scale)
                        .ticks(4)
                        .tickFormat(d => {
                            if (absolute) {
                                return yformat(Math.abs(d));
                            }
                            return yformat(d);
                        })
                        .tickSizeOuter(0);
                } else {
                    axisGenerator = axis(scale)
                        .tickFormat(d => {
                            if (absolute) {
                                return yformat(Math.abs(d));
                            }
                            return yformat(d);
                        })
                        .tickSizeOuter(0);
                }
            }
        } else if (this.props.type === "log") {
            if (this.props.min < 0 && this.props.max > 0) {
                throw Error("Unable to render YAxis with scale that crosses 0");
            }
            axisGenerator = axis()
                .scale(scale)
                .ticks(10, ".2s")
                .tickSizeOuter(0);
        }

        // Remove the old axis from under this DOM node
        select(ReactDOM.findDOMNode(this))
            .selectAll("*")
            .remove();

        // Add the new axis
        const x = align === "left" ? width - MARGIN : 0;
        const labelOffset =
            align === "left" ? this.props.labelOffset - 50 : 40 + this.props.labelOffset;

        //
        // Style
        //

        const labelStyle = merge(
            true,
            defaultStyle.label,
            this.props.style.label ? this.props.style.label : {}
        );
        const valueStyle = merge(
            true,
            defaultStyle.values,
            this.props.style.values ? this.props.style.values : {}
        );
        const axisStyle = merge(
            true,
            defaultStyle.axis,
            this.props.style.axis ? this.props.style.axis : {}
        );
        const tickStyle = merge(
            true,
            defaultStyle.tick,
            this.props.style.tick ? this.props.style.tick : {}
        );

        const tickSize = this.props.showGrid && this.props.isInnerAxis ? -chartExtent : 5;

        this.axis = select(ReactDOM.findDOMNode(this))
            .append("g")
            .attr("transform", `translate(${x},0)`)
            .attr("class", "yaxis")
            .styles(valueStyle)
            .call(axisGenerator.tickSize(tickSize))
            .append("text")
            .text(this.props.label)
            .styles(labelStyle)
            .attr("transform", "rotate(-90)")
            .attr("y", labelOffset)
            .attr("dy", ".71em")
            .attr("text-anchor", "end");

        select(ReactDOM.findDOMNode(this))
            .select("g")
            .selectAll(".tick")
            .select("text")
            .styles(valueStyle);

        select(ReactDOM.findDOMNode(this))
            .select("g")
            .selectAll(".tick")
            .select("line")
            .styles(tickStyle);

        select(ReactDOM.findDOMNode(this))
            .select("g")
            .selectAll(".domain")
            .remove();

        if (!this.props.hideAxisLine) {
            select(ReactDOM.findDOMNode(this))
                .select("g")
                .append("line")
                .styles(axisStyle)
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", 0)
                .attr("y2", this.props.height);
        }
    }

    render() {
        return <g />;
    }
}

YAxis.defaultProps = {
    id: "yaxis", // id referred to by the chart
    align: "left", // left or right of the chart
    min: 0, // range
    max: 1,
    type: "linear", // linear, log, or power
    absolute: false, // Display scale always positive
    format: ".2s", // Format string for d3.format
    labelOffset: 0, // Offset the label position
    transition: 100, // Axis transition time
    width: 80,
    style: defaultStyle
};

YAxis.propTypes = {
    /**
     * A name for the axis which can be used by a chart to reference the axis.
     * This is used by the ChartRow to match charts to this axis.
     */
    id: PropTypes.string.isRequired, // eslint-disable-line

    /**
     * Show or hide this axis
     */
    visible: PropTypes.bool,

    /**
     * The label to be displayed alongside the axis.
     */
    label: PropTypes.string,

    /**
     * The scale type: linear, power, or log.
     */
    type: PropTypes.oneOf(["linear", "power", "log"]),

    /**
     * Minium value, which combined with "max", define the scale of the axis.
     */
    min: PropTypes.number.isRequired, // eslint-disable-line

    /**
     * Maxium value, which combined with "min,"" define the scale of the axis.
     */
    max: PropTypes.number.isRequired, // eslint-disable-line

    /**
     * A d3 scale for the y-axis which you can use to transform your data in the y direction.
     * If omitted, the scale will be automatically computed based on the max and min props.
     */
    yScale: PropTypes.func,

    /**
     * Render all ticks on the axis as positive values.
     */
    absolute: PropTypes.bool, // eslint-disable-line

    /**
     * Object specifying the available parameters by which the axis can be
     * styled. The object can contain: "label", "values" and "axis". Each of these
     * is an inline CSS style applied to the axis label, axis values (ticks) and axis lines
     * respectively.
     *
     * In addition the axis label (i.e. title) itself can be styled with: "labelColor",
     * "labelFont", "labelWeight" and "labelSize". The axis values (i.e. ticks) can
     * styled with "valueColor", "valueWeight" and "valueSize".
     */
    style: PropTypes.shape({
        label: PropTypes.object, // eslint-disable-line
        axis: PropTypes.object, // eslint-disable-line
        values: PropTypes.object // esline-disable-line
    }),

    /**
     * The transition time for moving from one scale to another
     */
    transition: PropTypes.number,

    /**
     * The width of the axis
     */
    width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),

    /**
     * Offset the axis label from its default position. This allows you to
     * fine tune the label location, which may be necessary depending on the
     * scale and how much room the tick labels take up. Maybe positive or
     * negative.
     */
    labelOffset: PropTypes.number,

    /**
     * If a string, the d3.format for the axis labels (e.g. `format=\"$,.2f\"`).
     * If a function, that function will be called with each tick value and
     * should generate a formatted string for that value to be used as the label
     * for that tick (e.g. `function (n) { return Number(n).toFixed(2) }`).
     */
    format: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),

    /**
     * If the chart should be rendered to with the axis on the left or right.
     * If you are using the axis in a ChartRow, you do not need to provide this.
     */
    align: PropTypes.string,

    /**
     * [Internal] The scale supplied by the ChartRow
     */
    scale: PropTypes.func,

    /**
     * [Internal] The height supplied by the surrounding ChartContainer
     */
    height: PropTypes.number,

    /**
     * The number of ticks
     */
    tickCount: PropTypes.number
};
