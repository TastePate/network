from django.contrib.auth.models import AbstractUser
from django.urls import reverse

from .models import User, Post, Comment
from django.test import TestCase

class PostTest(TestCase):

    def setUp(self):
        self.users_count = 5

        self.user_author = User.objects.create(
            username="user",
            password="123",
        )

        self.users = [User.objects.create(
            username=f"user_{i}"
        ) for i in range(self.users_count)]

    def test_post_create(self):
        post = Post.objects.create(
            author=self.user_author,
            title="Hello",
            body="Test post"
        )

        self.assertEqual(post.author, self.user_author)
        self.assertEqual(post.title, "Hello")
        self.assertEqual(self.user_author.posts.count(), 1)

    def test_post_likes(self):
        post = Post.objects.create(
            author=self.user_author,
            title="Test likes",
            body="Test likes"
        )

        for i in range(self.users_count):
            post.likes.add(User.objects.create(
                username=f"{i}",
                password="123"
            ))

        self.assertEqual(post.likes.count(), self.users_count)

    def test_post_cannot_one_user_likes_twice(self):
        post = Post.objects.create(
            author=self.user_author,
            title="Test likes",
            body="Test likes"
        )

        post.likes.add(self.users[0])
        post.likes.add(self.users[0])
        self.assertEqual(post.likes.count(), 1)

    def test_post_create_comments(self):
        post = Post.objects.create(
            author=self.user_author,
            title="Test comments",
            body="Test comments"
        )

        for i in self.users:
            post.comments.add(Comment.objects.create(
                author=i,
                body=f"My name is {i}"
            ))

        self.assertEqual(post.comments.count(), self.users_count)

    def test_post_guest_cannot_create_comment(self):
        post = Post.objects.create(
            author = self.user_author,
            title = 'title',
            body = 'body'
        )

        before = post.comments.count()

        response = self.client.post(
            reverse("comment", args=(post.id, )),
            {'body': 'comment'}
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(before, post.comments.count())

    def test_post_guest_cannot_like(self):
        post = Post.objects.create(
            author = self.user_author,
            title = "title",
            body = "body"
        )

        before = post.likes.count()

        response = self.client.post(
            reverse("like", args=(post.id, ))
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(before, post.likes.count())

    def test_post_cannot_be_created_by_guest(self):
        before = Post.objects.count()

        response = self.client.post(
            reverse("create_post"), {
                'author': self.user_author,
                'title': 'title',
                'body': 'body'
            }
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(before, Post.objects.count())

    def test_post_like_and_unlike(self):
        post = Post.objects.create(
            author=self.user_author,
            title="title",
            body="body"
        )

        self.client.force_login(self.user_author)

        self.client.post(
            reverse(f"like", args=(post.id, ))
        )

        self.assertEqual(post.likes.count(), 1)

        self.client.post(
            reverse(f"like", args=(post.id,))
        )

        self.assertEqual(post.likes.count(), 0)

    def test_post_create_post_successfully_by_authorized(self):
        self.client.force_login(self.user_author)

        response = self.client.post(
            reverse(f"create_post"), {
                'title': 'title',
                'body': 'body',
                'user': self.user_author,
            }
        )

        json = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(Post.objects.filter(pk=int(json["post_id"])).exists())

    def test_post_create_comment_successfully_by_authorized(self):
        self.client.force_login(self.user_author)

        post = Post.objects.create(
            title='title',
            body='body',
            author=self.user_author
        )

        response = self.client.post(
            reverse(f"comment", args=(post.id,)), {
                'body': 'body',
            }
        )

        json = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(Post.objects.filter(pk=post.id)
                        .first()
                        .comments
                        .filter(pk=json["comment_id"])
                        .exists())
        self.assertTrue(Comment.objects.filter(pk=json["comment_id"]).exists())

