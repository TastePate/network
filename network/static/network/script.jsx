const View = Object.freeze({
    POSTS: "all_posts",
    PROFILE: "profile",
    FOLLOWING: "following"
})

function App() {
    const [view, setView] = React.useState(View.POSTS);
    const [profileUserId, setProfileUserId] = React.useState(user_id)

    let display;
    switch (view) {
        case View.POSTS:
            display = <Posts setView={setView} setProfileUserId={setProfileUserId} showCreateForm={true}/>
            break;
        case View.PROFILE:
            display = <Profile userId={profileUserId} setView={setView} setProfileUserId={setProfileUserId}/>
            break;
        case View.FOLLOWING:
            display = <Profile />
            break;
    }

    return (
        <div className="main">
            <NavBar setView={setView} setProfileUserId={setProfileUserId}/>
            {display}
        </div>
    );
}

function NavBar(props) {
    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
            <a className="navbar-brand" href="#">Network</a>
          
            <div>
              <ul className="navbar-nav mr-auto">
                  {authenticated ?
                    <li className="nav-item">
                        <a className="nav-link" href="#" onClick={() => {
                            props.setView(View.PROFILE);
                            props.setProfileUserId(user_id)
                        }}><strong>{ username }</strong></a>
                    </li> : null
                  }
                    <li className="nav-item">
                      <a className="nav-link" href="#" onClick={() => props.setView(View.POSTS)}>All Posts</a>
                    </li>
                {authenticated ?
                    <React.Fragment>
                        <li className="nav-item">
                            <a className="nav-link" href="#" onClick={() => props.setView(View.FOLLOWING)}>Following</a>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href="/logout">Log Out</a>
                        </li>
                    </React.Fragment>
                    :
                    <React.Fragment>
                        <li className="nav-item">
                            <a className="nav-link" href="/login">Log In</a>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href="/register">Register</a>
                        </li>
                    </React.Fragment>
                }
              </ul>
            </div>
          </nav>
    );
}

function Posts(props) {
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
        const response = Object.hasOwn(props, "author_id")
            ? await fetch(`posts/${page}?author_id=${props.author_id}`)
            : await fetch(`posts/${page}`);
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
        openPage(1)
    }, [props.author_id]);

    const root = document.querySelector('.body');
    const isAuthenticated = root.dataset.authenticated === "true";

    return (
        <div className="posts-container">
            {isAuthenticated && props.showCreateForm ? <CreateNewPost page_changer={openPage}/> : null}
            <div className="posts">
                {pageState["posts"]
                    .map(post => (
                         <Post key={post.id.toString()}
                               post={post}
                               page={pageState["page"]}
                               page_changer={openPage}
                               setProfileUserId={props.setProfileUserId}
                               setView={props.setView}
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
                    <span>
                        <a href="#" onClick={() => {
                            props.setProfileUserId(props.post.author_id);
                            props.setView(View.PROFILE);
                        }}>
                            {props.post.author}
                        </a>
                    </span>
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

function Profile(props) {
    const [profile, setProfile] = React.useState({
        username: "",
        followers: "",
        subscriptions: "",
        my_profile: false,
        is_following: false,
    });

    React.useEffect(() => {
        fetch(`/profile/${props.userId}`)
            .then(response => response.json())
            .then(json => {
                setProfile({
                    username: json["username"],
                    followers: json["followers"],
                    subscriptions: json["subscriptions"],
                    my_profile: json["my_profile"],
                    is_following: json["is_following"],
                });
            });
    }, [props.userId]);

    function updateSubscription() {
        const csrftoken = Cookies.get('csrftoken');

        const path = profile["is_following"] ? "unsubscribe" : "subscribe";
        const method = profile["is_following"] ? "DELETE" : "POST";
        fetch(`/${path}/${props.userId}`, {
            method: method,
            headers: {
                "X-CSRFToken": csrftoken
            }
        })
            .then(response => response.json())
            .then(json => {
                setProfile(json);
            });
    }

    return (
        <div className="profile">
            {
                !profile["my_profile"]
                    ?
                        profile["is_following"]
                            ? <button onClick={updateSubscription}>Unsubscribe</button>
                            : <button onClick={updateSubscription}>Subscribe</button>

                    : null
            }
            <span className="username">{profile["username"]}</span>
            <span className="sub-info">Followers: {profile["followers"]}</span>
            <span className="sub-info">Subscriptions: {profile["subscriptions"]}</span>
            <Posts author_id={props.userId}
                   showCreateForm={false}
                   setView={props.setView}
                   setProfileUserId={props.setProfileUserId}/>
        </div>
    );
}

const root = document.querySelector(".body");
const authenticated = root.dataset.authenticated === "true";
const user_id = root.dataset.authenticatedUserId;
const username = root.dataset.username;
ReactDOM.render(<App />, root);