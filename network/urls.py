
from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path("comment/<int:post_id>", views.comment, name="comment"),
    path("like/<int:post_id>", views.like, name="like"),
    path("create_post", views.create_post, name="create_post"),
    path("posts/<int:page>", views.posts, name="posts"),
    path("edit_post/<int:post_id>", views.edit_post, name="edit_post")
]
