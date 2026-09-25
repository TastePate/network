function App() {
    return (
        <div className="main">
            <Posts />
        </div>
    );
}

function Posts() {
    const [pageState, setPageState] = React.useState({
        posts: [],
        page: 1,
        num_pages: 0,
        has_next: false,
        has_previous: false,
        loading: 0,
        error: ""
    });

    function setPage(new_page) {
        setPageState({
            ...pageState,
            page: new_page,
        });
    }

    React.useEffect(() => {
       fetch(`posts/${pageState["page"]}`)
           .then(response => response.json())
           .then(json => {
                if (Object.hasOwn(json, "error")) {
                    console.log(json["error"]);
                    setPageState({
                        ...pageState,
                        error: json["error"],
                    })
                } else {
                    console.log(json);
                    setPageState({
                        ...pageState,
                        posts: json["posts"],
                        page: json["page"],
                        num_pages: json["num_pages"],
                        has_next: json["has_next"],
                        has_previous: json["has_previous"]
                    })
                }
        });
    }, [pageState.page]);

    return (
        <div className="posts-container">
            <div className="posts">
                {pageState["posts"].map(post => (
                         <Post key={post.id.toString()} post={post}/>
                    )
                )}
            </div>
            <PostsNavigation num_pages={pageState["num_pages"]}
                             page_changer={setPage}
                             current_page={pageState["page"]}/>
        </div>
    );
}

function PostsNavigation(props) {
    const pages = [];

    for (let i = 1; i <= props.num_pages; i++) {
        pages.push(<a key={i.toString()} onClick={() => props.page_changer(i)}>{i}</a>);
    }

    const is_previous_disabled = props.current_page === 1;
    const is_next_disabled = props.current_page === props.num_pages;

    return (
        <div className="posts-nvaigation">
            <button disabled={is_previous_disabled}
                    className="navigate-button previous"
                    onClick={() => props.page_changer(props.current_page - 1)}>Previous</button>
            {pages}
            <button disabled={is_next_disabled}
                    className="navigate-button next"
                    onClick={() => props.page_changer(props.current_page + 1)}>Next</button>
        </div>
    );
}

function Post(props) {
    return (
        <div className="post">
            <span>{props.post.author}</span>
            <span>{props.post.title}</span>
            <span>{props.post.body}</span>
            <span>{props.post.post_date}</span>
            <Likes post={props.post}/>
        </div>
    );
}

function Likes(props) {
    const [likesState, setLikesState] = React.useState({
        likes: props.post.likes
    });

    async function like() {
        const csrftoken = Cookies.get('csrftoken');

        const response = await fetch(`like/${props.post.id}`, {
            method: "POST",
            headers: {
                "X-CSRFToken": csrftoken
            }
        });
        const data = await response.json();

        if (response.ok) {
            setLikesState({
                ...likesState,
                likes: data["likes"],
            });
        } else {
            alert(data["error"])
        }
    }

    return (
        <div className="likes-container">
            <span className="likes">Likes: {likesState["likes"]}</span>
            <button className="like" onClick={like}>Like</button>
        </div>
    );
}

ReactDOM.render(<App />, document.querySelector('.body'));