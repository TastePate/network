from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import CASCADE
from django.db.models.constraints import UniqueConstraint


class User(AbstractUser):
    pass


class Post(models.Model):
    title = models.CharField(max_length=200)
    body = models.CharField(max_length=5000)
    author = models.ForeignKey(User, on_delete=CASCADE, related_name="posts")
    post_date = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField("User", related_name="user_likes")
    comments = models.ManyToManyField("Comment", related_name="commented_post")


class Comment(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    body = models.CharField(max_length=2000)
    comment_date = models.DateTimeField(auto_now_add=True)


class Subscription(models.Model):
    origin = models.ForeignKey(User, on_delete=CASCADE, related_name="my_followers")
    follower = models.ForeignKey(User, on_delete=CASCADE, related_name="my_subscriptions")
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["origin", "follower"], name="unique_subscription")
        ]