const View = Object.freeze({
    ALL_POSTS: "all_posts",
    FOLLOWING: "following",
    PROFILE: "profile"
})

function App() {
    const [view, setView] = React.useState(View.ALL_POSTS);

    let show;
    if (view === View.ALL_POSTS) {
        show = <Posts />
    } else {
    }
    return (
        <div className="main">
            {show}
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

    async function openPage(page) {
        const response = await fetch(`posts/${page}`);
        const json = await response.json();

        if (Object.hasOwn(json, "error")) {
            setPageState({
                ...pageState,
                error: json["error"],
            })
        } else {
            setPageState({
                ...pageState,
                posts: json["posts"],
                page: json["page"],
                num_pages: json["num_pages"],
                has_next: json["has_next"],
                has_previous: json["has_previous"]
            })
        }
    }

    React.useEffect(() => {
        openPage(pageState["page"])
    }, []);

    const root = document.querySelector('.body');
    const isAuthenticated = root.dataset.authenticated === "true";

    return (
        <div className="posts-container">
            {isAuthenticated ? <CreateNewPost page_changer={openPage}/> : null}
            <div className="posts">
                {pageState["posts"].map(post => (
                         <Post key={post.id.toString()}
                               post={post}
                               page={pageState["page"]}
                               page_changer={openPage}
                         />
                    )
                )}
            </div>
            <PostsNavigation num_pages={pageState["num_pages"]}
                             page_changer={openPage}
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
    const [view, setView] = React.useState("post");

    function renderView() {
        if (view === "edit") {
            return (
                <div className="post">
                    <EditPost post={props.post}
                              back={() => setView("post")}
                              reset_page={() => props.page_changer(props.page)}/>
                    <a href="#" onClick={() => setView("post")}>Back</a>
                </div>
            );
        } else if (view === "post") {
            return (
                <div className="post">
                    <span>{props.post.author}</span>
                    <span>{props.post.title}</span>
                    <span>{props.post.body}</span>
                    <span>{props.post.post_date}</span>
                    <Likes post={props.post}/>
                    {props.post.can_edit ? <a href="#" onClick={() => setView("edit")}>Edit</a> : null}
                </div>)
        }
    }

    return renderView();
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

function CreateNewPost(props) {
    async function submit(event) {
        const csrftoken = Cookies.get('csrftoken');
        const form = event.currentTarget;

        event.preventDefault();

        const response = await fetch(
            '/create_post', {
                method: "POST",
                headers: {
                    "X-CSRFToken": csrftoken
                },
                body: new FormData(form)
            }
        );
        const json = await response.json();

        if (response.ok) {
            alert("Post has been created successfully!");
            form.reset();
            props.page_changer(1);
        } else {
            alert(json["error"]);
        }
    }

    return (
        <div className="create-post-form">
            <form action="create_post" method="post" onSubmit={submit}>
                <input name="title" type="text"/>
                <textarea name="body" placeholder="What are you thinking about right now?"></textarea>
                <input type="submit"/>
            </form>
        </div>
    );
}

function EditPost(props) {
    async function submit(event) {
        const csrftoken = Cookies.get('csrftoken');
        const form = event.currentTarget;
        const formData = new FormData(form);

        event.preventDefault();

        const response = await fetch(
            `/edit_post/${props.post.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrftoken
                },
                body: JSON.stringify({
                    title: formData.get("title"),
                    body: formData.get("body")
                })
            }
        );
        const json = await response.json();

        if (response.ok) {
            props.back();
            props.reset_page();
        } else {
            alert(json["error"]);
        }
    }

    return (
        <div className="edit-post-form">
            <form action="edit_post" method="patch" onSubmit={submit}>
                <input name="title" type="text" defaultValue={props.post.title}/>
                <textarea name="body" defaultValue={props.post.body}></textarea>
                <input type="submit" value="Save" />
            </form>
        </div>
    );
}

ReactDOM.render(<App/>, document.querySelector('.body'));