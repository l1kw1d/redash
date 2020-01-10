import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { find, has } from "lodash";
import moment from "moment";
import { markdown } from "markdown";
import Button from "antd/lib/button";
import Dropdown from "antd/lib/dropdown";
import Icon from "antd/lib/icon";
import Menu from "antd/lib/menu";
import Tooltip from "antd/lib/tooltip";
import SignedOutPageWrapper from "@/components/ApplicationArea/SignedOutPageWrapper";
import { Query } from "@/services/query";
import location from "@/services/location";
import { formatDateTime } from "@/lib/utils";
import HtmlContent from "@/components/HtmlContent";
import Parameters from "@/components/Parameters";
import { Moment } from "@/components/proptypes";
import TimeAgo from "@/components/TimeAgo";
import Timer from "@/components/Timer";
import QueryResultsLink from "@/components/EditVisualizationButton/QueryResultsLink";
import { ErrorBoundaryContext } from "@/components/ErrorBoundary";
import VisualizationName from "@/visualizations/VisualizationName";
import VisualizationRenderer from "@/visualizations/VisualizationRenderer";
import { VisualizationType } from "@/visualizations";

import logoUrl from "@/assets/images/redash_icon_small.png";

function VisualizationEmbedHeader({ queryName, queryDescription, visualization }) {
  return (
    <div className="embed-heading p-b-10 p-r-15 p-l-15">
      <h3>
        <img src={logoUrl} alt="Redash Logo" style={{ height: "24px", verticalAlign: "text-bottom" }} />
        <VisualizationName visualization={visualization} /> {queryName}
        {queryDescription && (
          <small>
            <HtmlContent className="markdown text-muted">{markdown.toHTML(queryDescription || "")}</HtmlContent>
          </small>
        )}
      </h3>
    </div>
  );
}

VisualizationEmbedHeader.propTypes = {
  queryName: PropTypes.string.isRequired,
  queryDescription: PropTypes.string,
  visualization: VisualizationType.isRequired,
};

VisualizationEmbedHeader.defaultProps = { queryDescription: "" };

function VisualizationEmbedFooter({
  query,
  queryResults,
  updatedAt,
  refreshStartedAt,
  queryUrl,
  hideTimestamp,
  apiKey,
}) {
  const downloadMenu = (
    <Menu>
      <Menu.Item>
        <QueryResultsLink
          fileType="csv"
          query={query}
          queryResult={queryResults}
          apiKey={apiKey}
          disabled={!queryResults || !queryResults.getData || !queryResults.getData()}
          embed>
          <Icon type="file" /> Download as CSV File
        </QueryResultsLink>
      </Menu.Item>
      <Menu.Item>
        <QueryResultsLink
          fileType="tsv"
          query={query}
          queryResult={queryResults}
          apiKey={apiKey}
          disabled={!queryResults || !queryResults.getData || !queryResults.getData()}
          embed>
          <Icon type="file" /> Download as TSV File
        </QueryResultsLink>
      </Menu.Item>
      <Menu.Item>
        <QueryResultsLink
          fileType="xlsx"
          query={query}
          queryResult={queryResults}
          apiKey={apiKey}
          disabled={!queryResults || !queryResults.getData || !queryResults.getData()}
          embed>
          <Icon type="file-excel" /> Download as Excel File
        </QueryResultsLink>
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="tile__bottom-control">
      {!hideTimestamp && (
        <span>
          <a className="small hidden-print">
            <i className="zmdi zmdi-time-restore" />{" "}
            {refreshStartedAt ? <Timer from={refreshStartedAt} /> : <TimeAgo date={updatedAt} />}
          </a>
          <span className="small visible-print">
            <i className="zmdi zmdi-time-restore" /> {formatDateTime(updatedAt)}
          </span>
        </span>
      )}
      {queryUrl && (
        <span className="hidden-print">
          <Tooltip title="Open in Redash">
            <Button className="icon-button" href={queryUrl} target="_blank">
              <i className="fa fa-external-link" />
            </Button>
          </Tooltip>
          {!query.hasParameters() && (
            <Dropdown overlay={downloadMenu} disabled={!queryResults} trigger={["click"]} placement="topLeft">
              <Button loading={!queryResults && !!refreshStartedAt} className="m-l-5">
                Download Dataset
                <i className="fa fa-caret-up m-l-5" />
              </Button>
            </Dropdown>
          )}
        </span>
      )}
    </div>
  );
}

VisualizationEmbedFooter.propTypes = {
  query: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  queryResults: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  updatedAt: PropTypes.string,
  refreshStartedAt: Moment,
  queryUrl: PropTypes.string,
  hideTimestamp: PropTypes.bool,
  apiKey: PropTypes.string,
};

VisualizationEmbedFooter.defaultProps = {
  queryResults: null,
  updatedAt: null,
  refreshStartedAt: null,
  queryUrl: null,
  hideTimestamp: false,
  apiKey: null,
};

function VisualizationEmbed({ queryId, visualizationId, apiKey }) {
  const [query, setQuery] = useState(null);
  const [error, setError] = useState(null);
  const [refreshStartedAt, setRefreshStartedAt] = useState(null);
  const [queryResults, setQueryResults] = useState(null);

  useEffect(() => {
    let isCancelled = false;
    Query.get({ id: queryId }).$promise.then(result => {
      if (!isCancelled) {
        setQuery(result);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [queryId]);

  const refreshQueryResults = useCallback(() => {
    if (query) {
      setError(null);
      setRefreshStartedAt(moment());
      query
        .getQueryResultPromise()
        .then(result => {
          setQueryResults(result);
        })
        .catch(err => {
          setError(err.getError());
        })
        .finally(() => setRefreshStartedAt(null));
    }
  }, [query]);

  useEffect(() => {
    document.querySelector("body").classList.add("headless");
    refreshQueryResults();
  }, [refreshQueryResults]);

  if (!query) {
    return null;
  }

  const hideHeader = has(location.search, "hide_header");
  const hideParametersUI = has(location.search, "hide_parameters");
  const hideQueryLink = has(location.search, "hide_link");
  const hideTimestamp = has(location.search, "hide_timestamp");

  const showQueryDescription = has(location.search, "showDescription");
  visualizationId = parseInt(visualizationId, 10);
  const visualization = find(query.visualizations, vis => vis.id === visualizationId);

  return (
    <div className="tile m-l-10 m-r-10 p-t-10 embed__vis" data-test="VisualizationEmbed">
      {!hideHeader && (
        <VisualizationEmbedHeader
          queryName={query.name}
          queryDescription={showQueryDescription ? query.description : null}
          visualization={visualization}
        />
      )}
      <div className="col-md-12 query__vis">
        {!hideParametersUI && query.hasParameters() && (
          <div className="p-t-15 p-b-10">
            <Parameters parameters={query.getParametersDefs()} onValuesChange={refreshQueryResults} />
          </div>
        )}
        {error && <div className="alert alert-danger" data-test="ErrorMessage">{`Error: ${error}`}</div>}
        {!error && queryResults && (
          <VisualizationRenderer visualization={visualization} queryResult={queryResults} context="widget" />
        )}
        {!queryResults && refreshStartedAt && (
          <div className="d-flex justify-content-center">
            <div className="spinner">
              <i className="zmdi zmdi-refresh zmdi-hc-spin zmdi-hc-5x" />
            </div>
          </div>
        )}
      </div>
      <VisualizationEmbedFooter
        query={query}
        queryResults={queryResults}
        updatedAt={queryResults ? queryResults.getUpdatedAt() : undefined}
        refreshStartedAt={refreshStartedAt}
        queryUrl={!hideQueryLink ? query.getUrl() : null}
        hideTimestamp={hideTimestamp}
        apiKey={apiKey}
      />
    </div>
  );
}

VisualizationEmbed.propTypes = {
  queryId: PropTypes.string.isRequired,
  visualizationId: PropTypes.string,
  apiKey: PropTypes.string.isRequired,
};

export default {
  path: "/embed/query/:queryId/visualization/:visualizationId",
  authenticated: false,
  render: (routeParams, currentRoute, location) => (
    <SignedOutPageWrapper key={location.path} apiKey={location.search.api_key}>
      <ErrorBoundaryContext.Consumer>
        {({ handleError }) => (
          <VisualizationEmbed {...routeParams} apiKey={location.search.api_key} onError={handleError} />
        )}
      </ErrorBoundaryContext.Consumer>
    </SignedOutPageWrapper>
  ),
};