import json
from functools import wraps
from json import JSONDecodeError

from django import forms
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator, EmptyPage
from django.db import IntegrityError
from django.http import HttpResponseRedirect
from django.http.request import HttpRequest
from django.http.response import JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST, require_GET, require_http_methods

from .models import User, Comment, Post, Subscription


class CommentForm(forms.Form):
    body = forms.CharField(max_length=2000)

class PostForm(forms.Form):
    title = forms.CharField(max_length=200)
    body = forms.CharField(max_length=5000)

def user_exists(user_id_name):
    def func_decorator(view):
        @wraps(view)
        def wrapper(request, *args, **kwargs):
            if User.objects.filter(pk=kwargs[user_id_name]).exists():
                return view(request, *args, **kwargs)
            else:
                return JsonResponse({
                    "error": "User doesn't exist"
                }, status=404)
        return wrapper
    return func_decorator

@ensure_csrf_cookie
def index(request):
    return render(request, "network/index.html")


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")

@login_required(login_url="login")
@require_POST
def comment(request: HttpRequest, post_id):
    form = CommentForm(request.POST)
    post = Post.objects.filter(pk=post_id).first()
    if not post:
        return JsonResponse({
            "error": f"Post with {post_id} don't exist!"
        }, status=400)

    if form.is_valid():
        data = form.cleaned_data
        comment = Comment.objects.create(
            author=request.user,
            body=data['body']
        )
        post.comments.add(comment)

        return JsonResponse({
            "comment_id": comment.id,
            "author": request.user.username,
            "body": data['body']
        }, status=200)

    return JsonResponse({
        "error": form.errors
    }, status=400)

@require_POST
def like(request: HttpRequest, post_id):
    if not request.user.is_authenticated:
        return JsonResponse({
            "error": "Log in to Like this post",
        }, status=401)

    user = request.user
    post = Post.objects.filter(pk=post_id).first()
    if not post:
        return JsonResponse({
            "error": f"Post with {post_id} don't exist!"
        }, status=400)

    liked = post.likes.contains(user)
    if not liked:
        post.likes.add(user)
    else:
        post.likes.remove(user)

    liked = not liked
    post.save()

    return JsonResponse({
        "liked": liked,
        "likes": post.likes.count()
    })

@login_required(login_url="login")
@require_POST
def create_post(request: HttpRequest):
    form = PostForm(request.POST)
    if form.is_valid():
        data = form.cleaned_data
        post = Post.objects.create(
            title=data['title'],
            body=data['body'],
            author=request.user
        )

        return JsonResponse({
            "post_id": post.id
        }, status=200)

    return JsonResponse({
        "error": form.errors
    }, status=400)


@require_GET
def posts(request: HttpRequest, page):
    posts_by_page = 10

    queryset = Post.objects.order_by("-post_date")

    feed_mode = request.GET.get("feed")
    if feed_mode == "following" and not request.user.is_authenticated:
        return JsonResponse({
            "error": "You have to be authorized to watch your subscriptions' posts!"
        }, status=401)

    match feed_mode:
        case "following":
            subscriptions = request.user.my_subscriptions.values_list("origin_id", flat=True)
            queryset = queryset.filter(author_id__in=subscriptions)
        case "author":
            author_id = request.GET.get("author_id")
            if not author_id:
                return JsonResponse({
                    "error": "No author_id was not passed"
                }, status=400)

            if not User.objects.filter(pk=author_id).exists():
                return JsonResponse({
                    "error": f"No author with id {author_id}"
                }, status=400)

            queryset = queryset.filter(author_id=author_id)
        case "all" | None:
            pass


    paginator = Paginator(queryset, posts_by_page)

    try:
        page_obj = paginator.page(page)
    except EmptyPage:
        return JsonResponse({
            "error": f"There is no page with number {page}"
        }, status=404)

    posts_json = []

    for post in page_obj:
        posts_json.append({
            **post.serialize(),
            "can_edit": request.user.id == post.author_id and request.user.is_authenticated,
            "author_id": post.author.id
        })

    return JsonResponse({
        "posts": posts_json,
        "page": page_obj.number,
        "posts_count": len(page_obj),
        "num_pages": page_obj.paginator.num_pages,
        "has_next": page_obj.has_next(),
        "has_previous": page_obj.has_previous(),
    })


@require_http_methods(["PATCH"])
def edit_post(request: HttpRequest, post_id):
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict):
            raise TypeError()
    except JSONDecodeError, TypeError:
        return JsonResponse({
            "error": f"Invalid input json"
        }, status=400)

    user = request.user
    post = Post.objects.filter(pk=post_id).first()
    if not post:
        return JsonResponse({
            "error": f"There is no post with id {post_id}"
        }, status=404)

    if (not all(key in ("title", "body") and value.strip() for key, value in data.items())
            or not user.is_authenticated
            or user.id != post.author_id):
        return JsonResponse({
            "error": "You cannot edit this!"
        }, status=403)

    for field, value in data.items():
        setattr(post, field, value)

    post.save()
    return JsonResponse(post.serialize(), status=200)


def get_json_profile_info(request: HttpRequest, user):
    return JsonResponse({
        "username": user.username,
        "subscriptions": user.my_subscriptions.count(),
        "followers": user.my_followers.count(),
        "my_profile": user.id == request.user.id,
        "is_following": Subscription.objects.filter(origin_id=user.id,
                                                    follower_id=request.user.id).exists()
    }, status=200)

@user_exists("influencer_id")
@require_POST
def subscribe(request: HttpRequest, influencer_id):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({
            "error": "You have to authorize to follow profile!"
        }, status=403)

    if user.id == influencer_id:
        return JsonResponse({
            "error": "You can't follow yourself!"
        }, status=400)


    sub, created = Subscription.objects.get_or_create(
        origin_id=influencer_id,
        follower_id=user.id
    )

    if created:
        return get_json_profile_info(request, User.objects.filter(pk=influencer_id).first())
    else:
        return JsonResponse({
            "error": "You already subscribed on this user!"
        }, status=400)


@user_exists("influencer_id")
@require_http_methods(["DELETE"])
def unsubscribe(request: HttpRequest, influencer_id):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({
            "error": "You don't have permission to do that"
        }, status=403)

    sub_filter = Subscription.objects.filter(origin_id=influencer_id, follower_id=user.id)
    deleted_count, _ = sub_filter.delete()
    if deleted_count:
        return get_json_profile_info(request, User.objects.filter(pk=influencer_id).first())
    else:
        return JsonResponse({
            "error": "You didn't subscribe to this profile"
        }, status=400)


@user_exists("user_id")
@require_GET
def profile(request: HttpRequest, user_id):
    user = User.objects.filter(pk=user_id).first()
    return get_json_profile_info(request, user)