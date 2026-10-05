const View = Object.freeze({
    POSTS: "all_posts",
    PROFILE: "profile",
    FOLLOWING: "following",
    CREATE_POST: "create_post"
})

const PostsMode = Object.freeze({
    ALL: "all",
    FOLLOWING: "following",
    AUTHOR: "author"
});

function App() {
    const [view, setView] = React.useState(View.POSTS);
    const [profileUserId, setProfileUserId] = React.useState(user_id)

    let display;
    let title;
    switch (view) {
        case View.POSTS:
            title = "All Posts";
            display = <Posts mode={PostsMode.ALL}
                             setView={setView}
                             setProfileUserId={setProfileUserId}/>
            break;
        case View.PROFILE:
            title = "Profile";
            display = <Profile userId={profileUserId}
                               setView={setView}
                               setProfileUserId={setProfileUserId}/>
            break;
        case View.FOLLOWING:
            title = "Following";
            display = <Posts mode={PostsMode.FOLLOWING}
                             setView={setView}
                             setProfileUserId={setProfileUserId}/>
            break;
        case View.CREATE_POST:
            title = "New Post";
            display = authenticated ? <CreateNewPost setView={setView}/> : null;
            break;
    }

    return (
        <div className="main">
            <NavBar setView={setView} setProfileUserId={setProfileUserId}/>
            <main className="main-content">
                <header className="content-header">
                    <h1 className="content-heading">
                        {title}
                    </h1>
                    {authenticated ?
                        <a className="account-link" href="#" onClick={(event) => {
                            event.preventDefault();
                            setProfileUserId(user_id);
                            setView(View.PROFILE);
                        }}>
                            <span className="account-avatar" aria-hidden="true">{username.charAt(0).toUpperCase()}</span>
                            <span className="account-details">
                                <span className="account-caption">My profile</span>
                                <strong className="account-name">{username}</strong>
                            </span>
                            <span className="account-arrow" aria-hidden="true">↗</span>
                        </a>
                        : null
                    }
                </header>
                {display}
            </main>
        </div>
    );
}

function NavBar(props) {
    return (
        <aside className="navbar">
            <div className="logo">
                <a href="#">
                    <img src={document.querySelector('.body').dataset.logoUrl} alt="Logo"></img>
                </a>
            </div>
            <div className="menu-wrapper">
                <div className="menu">
                    <div className="menu-item">
                      <a className="nav-link" href="#" onClick={() => props.setView(View.POSTS)}>All Posts</a>
                    </div>
                    {authenticated ?
                        <React.Fragment>
                            <div className="menu-item">
                                <a className="nav-link" href="#" onClick={(event) => {
                                    event.preventDefault();
                                    props.setView(View.CREATE_POST);
                                }}>New Post</a>
                            </div>
                            <div className="menu-item">
                                <a className="nav-link" href="#" onClick={() => props.setView(View.FOLLOWING)}>Following</a>
                            </div>
                            <div className="menu-item">
                                <a className="nav-link" href="/logout">Log Out</a>
                            </div>
                        </React.Fragment>
                        :
                        <React.Fragment>
                            <div className="menu-item login">
                                <a className="nav-link" href="/login">Log In</a>
                            </div>
                            <div className="menu-item logout">
                                <a className="nav-link" href="/register">Register</a>
                            </div>
                        </React.Fragment>
                    }
                </div>
            </div>
          </aside>
    );
}

function Posts(props) {
    const [pageState, setPageState] = React.useState({
        posts: [],
        page: 1,
        num_pages: 0,
        has_next: false,
        has_previous: false,
        loading: true,
        error: ""
    });

    async function openPage(page) {
        setPageState(state => ({...state, loading: true, error: ""}));
        let path = `posts/${page}?feed=${props.mode}`
        if (props.mode === "author") {
            path += `&author_id=${props.author_id}`
        }

        try {
            const response = await fetch(path);
            const json = await response.json();

            if (!response.ok || Object.hasOwn(json, "error")) {
                setPageState(state => ({
                    ...state,
                    loading: false,
                    error: json["error"] || "Could not load posts. Please try again."
                }));
            } else {
                setPageState({
                    posts: json["posts"],
                    page: json["page"],
                    num_pages: json["num_pages"],
                    has_next: json["has_next"],
                    has_previous: json["has_previous"],
                    loading: false,
                    error: ""
                });
            }
        } catch (error) {
            setPageState(state => ({
                ...state,
                loading: false,
                error: "Could not load posts. Please try again."
            }));
        }
    }

    React.useEffect(() => {
        openPage(1)
    }, [props.author_id, props.mode]);

    let emptyMessage = "No one has posted anything yet. Be the first to share something!";
    if (props.mode === PostsMode.FOLLOWING) {
        emptyMessage = "No posts from the people you follow yet. Find someone in All Posts and follow them.";
    } else if (props.mode === PostsMode.AUTHOR) {
        emptyMessage = "This user hasn't posted anything yet.";
    }

    return (
        <div className="posts-container">
            {pageState.loading ? <p className="posts-loading" role="status">Loading posts…</p> : null}
            {pageState.error ?
                <div className="empty-posts" role="alert">
                    <h2>Couldn't load posts</h2>
                    <p>{pageState.error}</p>
                    <button type="button" onClick={() => openPage(pageState.page)}>Try again</button>
                </div>
                : null
            }
            {!pageState.loading && !pageState.error && pageState.posts.length === 0 ?
                <div className="empty-posts" role="status">
                    <span className="empty-posts-caption">Nothing here yet</span>
                    <h2>No posts yet</h2>
                    <p>{emptyMessage}</p>
                    {authenticated && props.mode === PostsMode.ALL ?
                        <button type="button" onClick={() => props.setView(View.CREATE_POST)}>Write a post</button>
                        : null
                    }
                </div>
                : null
            }
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
            {pageState.posts.length > 0 && !pageState.error ?
                <PostsNavigation num_pages={pageState["num_pages"]}
                                 page_changer={openPage}
                                 current_page={pageState["page"]}/>
                : null
            }
        </div>
    );
}

function PostsNavigation(props) {
    const [navigating, setNavigating] = React.useState(false);
    const currentPage = props.current_page || 1;
    const totalPages = Math.max(1, props.num_pages);
    const pages = [];
    let previousPage = 0;

    async function changePage(page) {
        if (navigating || page === currentPage || page < 1 || page > totalPages) {
            return;
        }
        setNavigating(true);
        try {
            await props.page_changer(page);
            const container = document.querySelector(".posts-container");
            if (container) {
                container.scrollTo({
                    top: 0,
                    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"
                });
            }
        } catch (error) {
            alert("Could not load this page. Please try again.");
        } finally {
            setNavigating(false);
        }
    }

    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7 && i !== 1 && i !== totalPages && Math.abs(i - currentPage) > 1) {
            continue;
        }
        if (previousPage && i - previousPage > 1) {
            pages.push(<span key={`gap-${i}`} className="pagination-gap" aria-hidden="true">…</span>);
        }
        pages.push(
            <button key={i.toString()}
                    type="button"
                    className={`navigate-button page-number${i === currentPage ? " is-current" : ""}`}
                    aria-label={`Page ${i}`}
                    aria-current={i === currentPage ? "page" : undefined}
                    disabled={navigating || i === currentPage}
                    onClick={() => changePage(i)}>{i}</button>
        );
        previousPage = i;
    }

    return (
        <nav className="posts-navigation" aria-label="Post pages" aria-busy={navigating}>
            <div className="pagination-controls">
                <button type="button"
                        disabled={navigating || currentPage === 1}
                        className="navigate-button previous"
                        aria-label="Previous page"
                        onClick={() => changePage(currentPage - 1)}>
                    <span aria-hidden="true">←</span>
                    <span className="pagination-label">Previous</span>
                </button>
                <div className="pagination-pages">{pages}</div>
                <button type="button"
                        disabled={navigating || currentPage === totalPages}
                        className="navigate-button next"
                        aria-label="Next page"
                        onClick={() => changePage(currentPage + 1)}>
                    <span className="pagination-label">Next</span>
                    <span aria-hidden="true">→</span>
                </button>
            </div>
            <span className="pagination-caption" aria-live="polite">Page {currentPage} of {totalPages}</span>
        </nav>
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
                <div className="post-wrapper">
                    <div className="post">
                        <div className="post-header">
                            <span>{props.post.title}</span>
                            <span>
                                <a href="#" onClick={() => {
                                    props.setProfileUserId(props.post.author_id);
                                    props.setView(View.PROFILE);
                                }}>
                                    {props.post.author}
                                </a>
                            </span>
                        </div>
                        <div className="post-main">
                            <span>{props.post.body}</span>
                        </div>
                        <div className="post-footer">
                            <span>{props.post.post_date}</span>
                            <Likes post={props.post}/>
                            {props.post.can_edit ? <a href="#" onClick={() => setView("edit")}>Edit</a> : null}
                        </div>
                    </div>
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
    const [formState, setFormState] = React.useState({
        submitting: false,
        error: ""
    });

    async function submit(event) {
        event.preventDefault();
        if (formState.submitting) {
            return;
        }

        const csrftoken = Cookies.get('csrftoken');
        const form = event.currentTarget;
        setFormState({submitting: true, error: ""});

        try {
            const response = await fetch('/create_post', {
                method: "POST",
                headers: {"X-CSRFToken": csrftoken},
                body: new FormData(form)
            });
            const json = await response.json();

            if (response.ok) {
                setFormState({submitting: false, error: ""});
                form.reset();
                props.setView(View.POSTS);
            } else {
                const message = typeof json["error"] === "string"
                    ? json["error"]
                    : Object.values(json["error"] || {}).flat().join(" ");
                setFormState({submitting: false, error: message || "Could not create the post. Please try again."});
            }
        } catch (error) {
            setFormState({submitting: false, error: "Could not create the post. Please try again."});
        }
    }

    return (
        <div className="create-post-page">
            <div className="create-post-form">
                <span className="create-post-caption">A little update from you</span>
                <h2>What's on your mind?</h2>
                <p>Share a thought, a story or something that made your day.</p>
                <form action="/create_post" method="post" onSubmit={submit} aria-busy={formState.submitting}>
                    <label htmlFor="post-title">Title</label>
                    <input id="post-title" name="title" type="text" maxLength={200}
                           placeholder="Give your post a title" required disabled={formState.submitting}/>
                    <label htmlFor="post-body">Your post</label>
                    <textarea id="post-body" name="body" maxLength={5000}
                              placeholder="What are you thinking about right now?" required disabled={formState.submitting}></textarea>
                    {formState.error ? <p className="form-error" role="alert">{formState.error}</p> : null}
                    <div className="create-post-actions">
                        <button type="button" className="cancel-post" disabled={formState.submitting}
                                onClick={() => props.setView(View.POSTS)}>Cancel</button>
                        <button type="submit" className="submit-post" disabled={formState.submitting}>
                            {formState.submitting ? "Publishing…" : "Publish post"}
                        </button>
                    </div>
                </form>
            </div>
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
                if (!Object.hasOwn(json, "error")) {
                    setProfile(json);
                } else {
                    alert(json["error"]);
                }
            });
    }

    return (
        <div className="profile">
            <section className="profile-summary" aria-label="User profile">
                <div className="profile-avatar" aria-hidden="true">
                    {profile.username ? profile.username.charAt(0).toUpperCase() : "…"}
                </div>
                <div className="profile-details">
                    <span className="profile-caption">{profile.my_profile ? "Your profile" : "Community member"}</span>
                    <h2 className="profile-username">{profile.username || "Loading…"}</h2>
                    <dl className="profile-stats">
                        <div className="profile-stat">
                            <dt>Followers</dt>
                            <dd>{profile.followers === "" ? "…" : profile.followers}</dd>
                        </div>
                        <div className="profile-stat">
                            <dt>Following</dt>
                            <dd>{profile.subscriptions === "" ? "…" : profile.subscriptions}</dd>
                        </div>
                    </dl>
                </div>
                {profile.username && !profile.my_profile && authenticated ?
                    <button type="button"
                            className={`profile-follow-button${profile.is_following ? " is-following" : ""}`}
                            onClick={updateSubscription}>
                        <span aria-hidden="true">{profile.is_following ? "✓" : "+"}</span>
                        {profile.is_following ? "Unfollow" : "Follow"}
                    </button>
                    : null
                }
            </section>
            <h3 className="profile-posts-heading">Posts by {profile.username || "…"}</h3>
            <Posts mode={PostsMode.AUTHOR}
                   author_id={props.userId}
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
