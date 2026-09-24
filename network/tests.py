from datetime import timedelta
from http.cookiejar import request_host
from math import ceil
from random import random, randint, shuffle

from django.urls import reverse
from django.utils import timezone

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

class AllPageTest(TestCase):

    def setUp(self):
        self.user = User.objects.create(
            username="user",
            password="123"
        )

        self.client.force_login(self.user)

    def test_all_page_available_for_authorized(self):
        response = self.client.get(
            reverse("index")
        )

        self.assertEqual(response.status_code, 200)

    def test_all_page_get_all_posts_from_all_users_less_ten(self):
        users_count = 5

        for i in range(users_count):
            user = User.objects.create(
                username=f"user_{i}",
                password="123"
            )

            Post.objects.create(
                title=f"{i}",
                body=f"{i}",
                author=user
            )

        response = self.client.get(
            reverse("posts", kwargs={"page": "1"}),
        )

        json_posts = response.json()["posts"]

        self.assertEqual(len(json_posts), users_count)


    def test_all_page_get_posts_from_newer_to_older(self):
        posts_count = 35
        timestamps = [
            timezone.now() + timedelta(hours=delta)
                for delta in range(posts_count // 2, -posts_count // 2, -1)
        ]

        shuffled = timestamps.copy()
        shuffle(shuffled)

        created_posts = []
        for random_date in shuffled:
            post = Post.objects.create(
                title=f"{random_date}",
                body=f"{random_date}",
                author=self.user
            )

            Post.objects.filter(pk=post.id).update(
                post_date=random_date
            )

            created_posts.append({
                "id": post.id,
                "post_date": random_date
            })

        created_posts.sort(
            key=lambda x: x["post_date"],
            reverse=True
        )

        expected_ids = [post["id"] for post in created_posts]

        for page in range(1, ceil(posts_count / 10) + 1):
            response = self.client.get(
                reverse("posts", kwargs={"page": f"{page}"})
            )

            start = (page - 1) * 10
            end = page * 10

            expected_page_ids = expected_ids[start:end]
            actual_page_ids = [post["id"] for post in response.json()["posts"]]

            self.assertEqual(expected_page_ids, actual_page_ids)

    def test_all_page_pagination(self):
        posts_count = 35

        for i in range(posts_count):
            Post.objects.create(
                title=f"{i}",
                body=f"{i}",
                author=self.user
            )

        response = self.client.get(
            reverse("posts", kwargs={"page": f"{1}"}),
        )

        self.assertEqual(len(response.json()["posts"]), 10)

        response = self.client.get(
            reverse("posts", kwargs={"page": f"{4}"}),
        )

        self.assertEqual(len(response.json()["posts"]), 5)

    def test_all_page_addition_info_is_correct(self):
        posts_count = 35

        for i in range(posts_count):
            Post.objects.create(
                title=f"{i}",
                body=f"{i}",
                author=self.user
            )

        response = self.client.get(
            reverse("posts", kwargs={"page": "1"})
        )

        json = response.json()
        self.assertEqual(json["page"], 1)
        self.assertEqual(json["posts_count"], 10)
        self.assertEqual(json["num_pages"], 4)
        self.assertEqual(json["has_next"], True)
        self.assertEqual(json["has_previous"], False)

        response = self.client.get(
            reverse("posts", kwargs={"page": "4"})
        )

        json = response.json()
        self.assertEqual(json["page"], 4)
        self.assertEqual(json["posts_count"], 5)
        self.assertEqual(json["has_next"], False)
        self.assertEqual(json["has_previous"], True)

    def test_app_page_get_too_much_page_number(self):
        Post.objects.create(
            title="title",
            body="body",
            author=self.user,
        )

        response = self.client.get(
            reverse("posts", kwargs={"page": "999"}),
        )

        json = response.json()
        self.assertIsNotNone(json.get("error", None))
        self.assertEqual(response.status_code, 404)

    def test_app_page_get_correct_zero_page(self):
        response = self.client.get(
            reverse("posts", kwargs={"page": "1"})
        )

        json = response.json()
        self.assertEqual(json["posts"], [])
        self.assertEqual(json["page"], 1)
        self.assertEqual(json["num_pages"], 1)
        self.assertFalse(json["has_next"])
        self.assertFalse(json["has_previous"])

