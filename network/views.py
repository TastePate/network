from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator, EmptyPage
from django.db import IntegrityError
from django import forms
from django.http import HttpResponse, HttpResponseRedirect
from django.http.request import HttpRequest
from django.http.response import JsonResponse
from django.shortcuts import render, redirect
from django.urls import reverse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST, require_GET

from .models import User, Comment, Post


class CommentForm(forms.Form):
    body = forms.CharField(max_length=2000)

class PostForm(forms.Form):
    title = forms.CharField(max_length=200)
    body = forms.CharField(max_length=5000)


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
            "id": post.id,
            "title": post.title,
            "body": post.body,
            "author": post.author.username,
            "post_date": post.post_date.isoformat(),
            "likes": post.likes.count(),
            "comments": post.comments.count(),
        })

    return JsonResponse({
        "posts": posts_json,
        "page": page_obj.number,
        "posts_count": len(page_obj),
        "num_pages": page_obj.paginator.num_pages,
        "has_next": page_obj.has_next(),
        "has_previous": page_obj.has_previous(),
    })
