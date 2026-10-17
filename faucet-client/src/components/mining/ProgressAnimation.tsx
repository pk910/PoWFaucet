import React from 'react';

export interface IProgressAnimationProps {
  imagesUrl: string;
  /** the moving picture, or the still one */
  animated: boolean;
}

export interface IProgressAnimationState {
  svg: string | null;
  failed: boolean;
}

/** the svg's text, fetched once per page */
let svgSource: Promise<string> | null = null;

function loadSvg(url: string): Promise<string> {
  if(!svgSource) {
    svgSource = fetch(url).then((rsp) => {
      if(!rsp.ok)
        throw new Error("progress.svg: HTTP " + rsp.status);
      return rsp.text();
    }).catch((err) => {
      svgSource = null;
      throw err;
    });
  }
  return svgSource;
}

/**
 * The mining picture: the animated cat or its still frame.
 *
 * Animated, it is the svg from static/images inlined into the page: twelve frame groups shown in
 * turn by a css animation, which costs the browser less than the gif did. Still, it is the png,
 * which costs nothing at all. The gif only comes back when the svg cannot be fetched.
 */
export class ProgressAnimation extends React.PureComponent<IProgressAnimationProps, IProgressAnimationState> {
  private mounted = false;

  constructor(props: IProgressAnimationProps) {
    super(props);
    this.state = {
      svg: null,
      failed: false,
    };
  }

  public componentDidMount() {
    this.mounted = true;
    if(this.props.animated)
      this.load();
  }

  public componentDidUpdate(prevProps: IProgressAnimationProps) {
    if(this.props.animated && !prevProps.animated && !this.state.svg)
      this.load();
  }

  public componentWillUnmount() {
    this.mounted = false;
  }

  private load() {
    loadSvg(this.props.imagesUrl + "/progress.svg").then((svg) => {
      if(this.mounted)
        this.setState({ svg: svg, failed: false });
    }, () => {
      if(this.mounted)
        this.setState({ failed: true });
    });
  }

  public render(): React.ReactElement {
    if(!this.props.animated)
      return <img src={this.props.imagesUrl + "/progress.png"} alt="" className="pow-progress-static" />;
    if(this.state.svg)
      return <div className="pow-progress-animation" dangerouslySetInnerHTML={{ __html: this.state.svg }} />;
    if(this.state.failed)
      return <img src={this.props.imagesUrl + "/progress.gif"} alt="" className="pow-progress-gif" />;
    return <img src={this.props.imagesUrl + "/progress.png"} alt="" className="pow-progress-static pow-progress-loading" />;
  }
}
