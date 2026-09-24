function App() {
    const [page, setPage] = React.useState({
        posts: [],
        page: 1,
        num_pages: 0,
        has_next: false,
        has_previous: false,
        loading: 0,
        error: ""
    });

    React.useEffect(() => {
       fetch(`posts/${page["page"]}`)
           .then(response => response.json())
           .then(json => {
                if (Object.hasOwn(json, "error")) {
                    console.log(json["error"]);
                    setPage({
                        ...page,
                        error: json["error"],
                    })
                } else {
                    console.log(json);
                    setPage({
                        ...page,
                        posts: json["posts"],
                        page: json["page"],
                        num_pages: json["num_pages"],
                        has_next: json["has_next"],
                        has_previous: json["has_previous"]
                    })
                }
        });
    }, [page.page]);

    return (
        <div>
            <Posts posts={page.posts}/>
        </div>
    );
}

function Posts(props) {
    return (
        <div className="posts">
            {props.posts.map(post => (
                    <div className="post">
                        <span>{post["title"]}</span>
                        <span>{post["body"]}</span>
                        <span>{post["author"]}</span>
                    </div>
                    )
                )};
        </div>
    );
}

ReactDOM.render(<App />, document.querySelector('.body'));